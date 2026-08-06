begin;

create extension if not exists pgcrypto;
create schema if not exists app_private;
revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated, service_role;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'user' check (role in ('user', 'analyst', 'admin')),
  status text not null default 'active' check (status in ('active', 'locked', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function app_private.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin' and p.status = 'active') $$;
revoke all on function app_private.is_admin() from public, anon;
grant execute on function app_private.is_admin() to authenticated, service_role;

create or replace function app_private.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$ begin
  insert into public.profiles (id, email, display_name)
  values (new.id, coalesce(new.email, ''), nullif(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end $$;
revoke all on function app_private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert or update of email on auth.users
for each row execute function app_private.handle_new_user();

insert into public.profiles (id, email, display_name)
select id, coalesce(email, ''), nullif(raw_user_meta_data ->> 'display_name', '') from auth.users
on conflict (id) do nothing;

create table if not exists public.app_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  auth_session_id uuid not null, device_fingerprint text, ip_address inet, user_agent text,
  aal text not null default 'aal1' check (aal in ('aal1','aal2')),
  is_active boolean not null default true, last_activity_at timestamptz not null default now(),
  expires_at timestamptz not null, revoked_at timestamptz, revoke_reason text, created_at timestamptz not null default now(),
  unique(user_id, auth_session_id)
);
create index if not exists app_sessions_user_active_idx on public.app_sessions(user_id, is_active, expires_at desc);

create table if not exists public.login_attempts (
  id bigint generated always as identity primary key, user_id uuid references auth.users(id) on delete cascade,
  email_hash text not null, ip_hash text not null, success boolean not null, failure_code text,
  attempted_at timestamptz not null default now()
);
create index if not exists login_attempts_lookup_idx on public.login_attempts(email_hash, ip_hash, attempted_at desc);

create table if not exists public.account_lockouts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  failed_attempts integer not null default 0 check (failed_attempts >= 0), locked_until timestamptz,
  reason text, updated_at timestamptz not null default now()
);

create table if not exists public.user_devices (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  fingerprint_hash text not null, name text, device_type text, os text, browser text,
  trusted boolean not null default false, revoked boolean not null default false,
  posture jsonb not null default '{}'::jsonb, last_seen_at timestamptz, created_at timestamptz not null default now(),
  unique(user_id, fingerprint_hash)
);
create index if not exists user_devices_user_idx on public.user_devices(user_id, revoked, last_seen_at desc);

create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null,
  session_id uuid references public.app_sessions(id) on delete set null, device_id uuid references public.user_devices(id) on delete set null,
  event_type text not null, severity text not null check (severity in ('info','low','medium','high','critical')),
  outcome text, resource text, correlation_id uuid not null default gen_random_uuid(),
  details jsonb not null default '{}'::jsonb, ip_address inet, created_at timestamptz not null default now()
);
create index if not exists security_events_user_time_idx on public.security_events(user_id, created_at desc);
create index if not exists security_events_severity_time_idx on public.security_events(severity, created_at desc);

create table if not exists public.trust_score_history (
  id bigint generated always as identity primary key, user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.app_sessions(id) on delete set null,
  trust_score numeric(5,2) not null check (trust_score between 0 and 100),
  factors jsonb not null default '{}'::jsonb, source text not null default 'policy', created_at timestamptz not null default now()
);
create index if not exists trust_score_user_time_idx on public.trust_score_history(user_id, created_at desc);

create table if not exists public.risk_score_history (
  id bigint generated always as identity primary key, user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.app_sessions(id) on delete set null,
  risk_score numeric(5,2) not null check (risk_score between 0 and 100),
  risk_level text not null check (risk_level in ('low','medium','high','critical')),
  factors jsonb not null default '{}'::jsonb, model_version text, created_at timestamptz not null default now()
);
create index if not exists risk_score_user_time_idx on public.risk_score_history(user_id, created_at desc);

create table if not exists public.model_registry (
  id uuid primary key default gen_random_uuid(), version text not null unique, feature_schema_version text not null,
  artifact_uri text not null, artifact_sha256 text not null check (artifact_sha256 ~ '^[a-f0-9]{64}$'),
  dataset_lineage jsonb not null, metrics jsonb not null, training_code_version text not null,
  status text not null default 'candidate' check (status in ('candidate','approved','active','retired','rejected')),
  approved_by uuid references auth.users(id) on delete set null, approved_at timestamptz, activated_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists one_active_model_idx on public.model_registry(status) where status = 'active';

create table if not exists public.ai_predictions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.app_sessions(id) on delete set null, model_id uuid not null references public.model_registry(id),
  feature_schema_version text not null, risk_probability numeric(7,6) not null check (risk_probability between 0 and 1),
  confidence numeric(7,6) check (confidence between 0 and 1), out_of_distribution boolean not null default false,
  reason_codes text[] not null default '{}', input_provenance jsonb not null default '{}'::jsonb,
  correlation_id uuid not null, created_at timestamptz not null default now()
);
create index if not exists ai_predictions_user_time_idx on public.ai_predictions(user_id, created_at desc);

create table if not exists public.trust_policies (
  id uuid primary key default gen_random_uuid(), name text not null unique, description text,
  resource_pattern text not null default '*', priority integer not null default 100,
  enabled boolean not null default true, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.policy_rules (
  id uuid primary key default gen_random_uuid(), policy_id uuid not null references public.trust_policies(id) on delete cascade,
  name text not null, condition jsonb not null, action text not null check (action in ('allow','challenge','restrict','deny')),
  severity text not null check (severity in ('low','medium','high','critical')), created_at timestamptz not null default now()
);
create index if not exists policy_rules_policy_idx on public.policy_rules(policy_id);

create table if not exists public.policy_decisions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.app_sessions(id) on delete set null, policy_id uuid references public.trust_policies(id) on delete set null,
  ai_prediction_id uuid references public.ai_predictions(id) on delete set null,
  resource text not null, action text not null check (action in ('allow','challenge','restrict','deny')),
  reason_codes text[] not null default '{}', evaluated_rules jsonb not null default '[]'::jsonb,
  correlation_id uuid not null, created_at timestamptz not null default now()
);
create index if not exists policy_decisions_user_time_idx on public.policy_decisions(user_id, created_at desc);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key, user_id uuid references auth.users(id) on delete set null,
  actor_role text, action text not null, resource_type text, resource_id text, outcome text not null,
  correlation_id uuid not null default gen_random_uuid(), metadata jsonb not null default '{}'::jsonb,
  ip_address inet, created_at timestamptz not null default now()
);
create index if not exists audit_logs_user_time_idx on public.audit_logs(user_id, created_at desc);
create index if not exists audit_logs_action_time_idx on public.audit_logs(action, created_at desc);

create table if not exists public.performance_metrics (
  id bigint generated always as identity primary key, user_id uuid references auth.users(id) on delete set null,
  metric_type text not null, duration_ms numeric(12,3) check (duration_ms >= 0), success boolean not null,
  endpoint text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists performance_metrics_type_time_idx on public.performance_metrics(metric_type, created_at desc);

create table if not exists public.research_metrics (
  id bigint generated always as identity primary key, metric_name text not null, metric_value numeric,
  evaluation_period text, metric_type text, provenance jsonb not null, approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.cloud_configurations (
  id uuid primary key default gen_random_uuid(), name text not null unique, provider text not null, region text,
  endpoint text, status text not null default 'unconfigured' check (status in ('unconfigured','active','degraded','disabled')),
  is_primary boolean not null default false, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.cloud_health_metrics (
  id bigint generated always as identity primary key, cloud_id uuid not null references public.cloud_configurations(id) on delete cascade,
  latency_ms numeric check (latency_ms >= 0), availability_percent numeric check (availability_percent between 0 and 100),
  error_rate numeric check (error_rate between 0 and 1), source text not null, checked_at timestamptz not null default now()
);

create table if not exists public.federated_rounds (
  id uuid primary key default gen_random_uuid(), round_number integer not null unique, status text not null default 'pending',
  model_version text not null, aggregation_algorithm text not null default 'fedavg', minimum_participants integer not null default 2,
  started_at timestamptz, completed_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.federated_participants (
  id uuid primary key default gen_random_uuid(), round_id uuid not null references public.federated_rounds(id) on delete cascade,
  organization_name text not null, artifact_sha256 text, sample_count integer check (sample_count >= 0),
  validation_metrics jsonb, uploaded_at timestamptz, created_at timestamptz not null default now(), unique(round_id, organization_name)
);

alter table public.profiles enable row level security;
alter table public.app_sessions enable row level security;
alter table public.login_attempts enable row level security;
alter table public.account_lockouts enable row level security;
alter table public.user_devices enable row level security;
alter table public.security_events enable row level security;
alter table public.trust_score_history enable row level security;
alter table public.risk_score_history enable row level security;
alter table public.model_registry enable row level security;
alter table public.ai_predictions enable row level security;
alter table public.trust_policies enable row level security;
alter table public.policy_rules enable row level security;
alter table public.policy_decisions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.performance_metrics enable row level security;
alter table public.research_metrics enable row level security;
alter table public.cloud_configurations enable row level security;
alter table public.cloud_health_metrics enable row level security;
alter table public.federated_rounds enable row level security;
alter table public.federated_participants enable row level security;

do $$ declare t text; begin
  foreach t in array array['app_sessions','account_lockouts','user_devices','security_events','trust_score_history','risk_score_history','ai_predictions','policy_decisions','audit_logs','performance_metrics'] loop
    execute format('drop policy if exists owner_read on public.%I', t);
    execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid()) = user_id or (select app_private.is_admin()))', t);
  end loop;
end $$;

drop policy if exists profile_read on public.profiles;
create policy profile_read on public.profiles for select to authenticated
using ((select auth.uid()) = id or (select app_private.is_admin()));

drop policy if exists profile_update_own on public.profiles;
create policy profile_update_own on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id and role = (select p.role from public.profiles p where p.id = (select auth.uid())));

drop policy if exists devices_manage_own on public.user_devices;
create policy devices_manage_own on public.user_devices for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

do $$ declare t text; begin
  foreach t in array array['model_registry','trust_policies','policy_rules','research_metrics','cloud_configurations','cloud_health_metrics','federated_rounds','federated_participants'] loop
    execute format('drop policy if exists authenticated_read on public.%I', t);
    execute format('create policy authenticated_read on public.%I for select to authenticated using (true)', t);
    execute format('drop policy if exists admin_manage on public.%I', t);
    execute format('create policy admin_manage on public.%I for all to authenticated using ((select app_private.is_admin())) with check ((select app_private.is_admin()))', t);
  end loop;
end $$;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke all on all tables in schema public from anon;

commit;
