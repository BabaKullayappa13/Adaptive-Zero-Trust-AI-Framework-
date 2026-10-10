'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ShieldAlert,
  Flame,
  FileCheck2,
  Users,
  Radio,
  CloudCog,
  BrainCircuit,
  ClipboardList,
  FileDown,
  Lock,
  ChevronRight
} from 'lucide-react'
import AdminLogoutButton from '@/components/admin-logout-button'

interface NavItem {
  href: string
  label: string
  icon: any
  tag?: string
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/security', label: 'Live Threat Feed', icon: ShieldAlert },
  { href: '/admin/phase4', label: 'Attack Simulation', icon: Flame },
  { href: '/admin/policies', label: 'Security Policies', icon: FileCheck2 },
  { href: '/admin/users', label: 'Users & Identities', icon: Users },
  { href: '/admin/sessions', label: 'Active Sessions', icon: Radio },
  { href: '/admin/performance', label: 'Cloud Gateways', icon: CloudCog },
  { href: '/admin/ai-monitoring', label: 'AI Monitoring Overview', icon: BrainCircuit, tag: 'Dedicated' },
  { href: '/admin/audit', label: 'Audit', icon: ClipboardList },
  { href: '/admin/reports', label: 'Reports / Settings', icon: FileDown }
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-full lg:w-64 shrink-0 bg-slate-950/80 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col justify-between p-4 backdrop-blur-md">
      <div>
        <div className="flex items-center gap-3 px-3 py-3 mb-4 rounded-xl bg-white/[0.03] border border-white/10">
          <span className="flex size-9 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
            <Lock className="size-4" />
          </span>
          <div>
            <p className="text-xs font-semibold text-white tracking-wide">SOC Portal</p>
            <p className="text-[10px] text-cyan-300/80 font-mono">Zero-Trust Admin</p>
          </div>
        </div>

        <nav className="space-y-1">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/15 border border-cyan-400/30 text-cyan-200 shadow-sm shadow-cyan-950/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`size-4 transition ${isActive ? 'text-cyan-300' : 'text-slate-400 group-hover:text-slate-300'}`} />
                  <span>{item.label}</span>
                </div>
                {item.tag ? (
                  <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                    {item.tag}
                  </span>
                ) : isActive ? (
                  <ChevronRight className="size-3.5 text-cyan-300" />
                ) : null}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="mt-8 pt-4 border-t border-white/10 space-y-3">
        <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-300">
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            Admin Verified
          </span>
          <span className="text-[10px] font-mono text-emerald-400/80">RBAC Active</span>
        </div>
        <div className="flex items-center justify-between gap-2 px-1">
          <Link
            href="/dashboard"
            className="text-xs text-slate-400 hover:text-cyan-300 transition"
          >
            ← Public View
          </Link>
          <AdminLogoutButton />
        </div>
      </div>
    </aside>
  )
}
