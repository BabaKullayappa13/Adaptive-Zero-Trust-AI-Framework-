'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Activity, ArrowRight, BrainCircuit, Check, Fingerprint, LockKeyhole, Network, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const capabilities = [
  { icon: ShieldCheck, title: 'Zero Trust', text: 'Verify identity, context, and policy before every sensitive request.' },
  { icon: BrainCircuit, title: 'Explainable AI', text: 'Turn live risk signals into decisions security teams can understand.' },
  { icon: Fingerprint, title: 'Continuous authentication', text: 'Re-evaluate trust as devices, networks, and behavior change.' },
  { icon: Network, title: 'Federated intelligence', text: 'Improve models without centralizing raw security telemetry.' },
]
const stack = ['Zero Trust', 'AI / ML', 'XAI', 'MFA', 'Device trust', 'Policy engine', 'FastAPI', 'PostgreSQL']

export default function HomePage() {
  const router = useRouter()
  const { user, accessToken, loadUser } = useAuthStore()
  useEffect(() => { void loadUser() }, [loadUser])
  useEffect(() => { if (user && accessToken) router.replace('/dashboard') }, [user, accessToken, router])
  if (user && accessToken) return <div className="min-h-screen bg-background" />

  return <div className="platform-shell min-h-screen text-foreground">
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Adaptive Zero Trust AI home">
          <span className="flex size-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary"><ShieldCheck className="size-5" /></span>
          <span className="text-sm font-semibold tracking-[0.12em]">ADAPTIVE <span className="text-primary">ZERO TRUST AI</span><small className="mt-1 block text-[9px] font-medium tracking-[0.24em] text-muted-foreground">SECURITY CONTROL PLANE</small></span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex" aria-label="Main navigation"><a href="#platform" className="transition hover:text-foreground">Platform</a><a href="#architecture" className="transition hover:text-foreground">Architecture</a><a href="#intelligence" className="transition hover:text-foreground">Intelligence</a><Link href="/auth/login" className="text-foreground transition hover:text-primary">Sign in</Link><Link href="/auth/register" className="button-primary">Get started <ArrowRight data-icon="inline-end" /></Link></nav>
        <Link href="/auth/login" className="button-secondary text-sm md:hidden">Sign in</Link>
      </div>
    </header>

    <main>
      <section className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-20 sm:px-8 lg:grid-cols-[1.1fr_.9fr] lg:pb-32 lg:pt-28">
        <div className="reveal">
          <div className="status-pill"><span className="status-dot" /> Security system operational</div>
          <p className="eyebrow mt-8">AI-powered adaptive security</p>
          <h1 className="mt-4 max-w-4xl text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.055em] sm:text-7xl">Intelligent security that continuously verifies every access request.</h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground">Adaptive Zero Trust combines identity, device context, behavior, risk intelligence, and policy enforcement into one calm, explainable control plane.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link href="/auth/register" className="button-primary">Explore security <ArrowRight data-icon="inline-end" /></Link><Link href="/auth/login" className="button-secondary">Sign in to control plane</Link></div>
          <div className="mt-12 flex flex-wrap gap-x-7 gap-y-3 text-xs text-muted-foreground"><span className="inline-flex items-center gap-2"><Check className="size-4 text-success" />Continuous verification</span><span className="inline-flex items-center gap-2"><Check className="size-4 text-success" />Risk-based access</span><span className="inline-flex items-center gap-2"><Check className="size-4 text-success" />Explainable decisions</span></div>
        </div>
        <div className="reveal reveal-delay-2 relative"><div className="absolute -inset-10 rounded-full bg-primary/10 blur-3xl" /><div className="relative security-console rounded-[1.75rem] p-5 sm:p-7"><div className="flex items-center justify-between border-b border-border pb-5"><div><p className="eyebrow">Live posture</p><p className="mt-2 text-sm font-medium">Your security posture</p></div><span className="badge-success">Trusted</span></div><div className="flex items-end justify-between py-8"><div><div className="data-number text-7xl font-semibold text-primary">--</div><p className="mt-2 text-sm text-muted-foreground">Awaiting authenticated telemetry</p></div><Activity className="size-12 text-primary/60" /></div><div className="grid grid-cols-2 gap-3"><div className="metric-tile"><Fingerprint className="size-4 text-success" /><span>Identity</span><strong>Verified</strong></div><div className="metric-tile"><LockKeyhole className="size-4 text-success" /><span>Policy</span><strong>Active</strong></div><div className="metric-tile"><BrainCircuit className="size-4 text-ai" /><span>AI engine</span><strong>Monitoring</strong></div><div className="metric-tile"><Network className="size-4 text-primary" /><span>Device</span><strong>Assessed</strong></div></div><p className="mt-5 text-xs leading-5 text-muted-foreground">Sign in to replace this preview with your real risk, trust, device, and session records.</p></div></div>
      </section>

      <section id="platform" className="border-y border-border/70 bg-surface/40"><div className="mx-auto max-w-7xl px-5 py-8 sm:px-8"><div className="flex flex-wrap items-center gap-x-8 gap-y-4 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{stack.map((item) => <span key={item} className="technology-badge">{item}</span>)}</div></div></section>

      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32"><div className="max-w-2xl"><p className="eyebrow">The platform</p><h2 className="section-title">Security decisions, made visible.</h2><p className="section-copy">A serious security platform should show its reasoning. Every surface is designed to help operators understand what changed, why access was allowed, and where trust needs attention.</p></div><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{capabilities.map(({ icon: Icon, title, text }) => <article key={title} className="platform-card"><span className="icon-box"><Icon className="size-5" /></span><h3 className="mt-6 text-lg font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p></article>)}</div></section>

      <section id="architecture" className="border-y border-border/70 bg-surface/35"><div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:py-32"><div><p className="eyebrow">Architecture</p><h2 className="section-title">Never trust. Always verify.</h2><p className="section-copy">The framework turns a login into an ongoing security conversation between identity, device, context, risk, policy, and the protected resource.</p><Link href="/auth/register" className="button-secondary mt-8">Enter the control plane <ArrowRight data-icon="inline-end" /></Link></div><div className="architecture-flow">{['Identity', 'Device context', 'AI risk engine', 'Explainable decision', 'Zero Trust policy', 'Protected resource'].map((item, index) => <div key={item} className="flow-step"><span>{String(index + 1).padStart(2, '0')}</span><strong>{item}</strong>{index < 5 && <ArrowRight className="size-4 text-primary" />}</div>)}</div></div></section>

      <section id="intelligence" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32"><div className="grid gap-5 lg:grid-cols-3"><article className="feature-panel lg:col-span-2"><p className="eyebrow">Explainable AI</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">Understand why the system made every decision.</h2><p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">Risk factors, policy outcomes, and recommended actions are surfaced from the security service—not hidden behind a score.</p><div className="mt-8 grid gap-3 sm:grid-cols-3"><div className="metric-tile"><span>Risk score</span><strong className="text-primary">Live</strong></div><div className="metric-tile"><span>Contributors</span><strong>Visible</strong></div><div className="metric-tile"><span>Action</span><strong>Adaptive</strong></div></div></article><article className="feature-panel"><p className="eyebrow">Privacy-preserving learning</p><h3 className="mt-3 text-2xl font-semibold">Federated intelligence</h3><p className="mt-4 text-sm leading-6 text-muted-foreground">Improve collective security intelligence without centralizing raw user data. Status stays honest when no distributed round is active.</p><div className="mt-8 flex items-center gap-3 text-sm"><span className="status-dot bg-ai" /> Integration-ready architecture</div></article></div></section>
    </main>
  </div>
}
