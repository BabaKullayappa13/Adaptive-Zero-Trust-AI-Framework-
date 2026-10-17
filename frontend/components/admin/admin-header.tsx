'use client'

import React from 'react'
import Link from 'next/link'
import { ShieldCheck, LucideIcon } from 'lucide-react'
import AdminLogoutButton from '@/components/admin-logout-button'

interface AdminHeaderProps {
  title: string
  description?: string
  eyebrow?: string
  icon?: LucideIcon
  children?: React.ReactNode
}

export default function AdminHeader({
  title,
  description,
  eyebrow = 'Adaptive Zero-Trust AI Framework',
  icon: Icon = ShieldCheck,
  children
}: AdminHeaderProps) {
  return (
    <header className="flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-start lg:justify-between">
      {/* Left Side: Logo, Title, Eyebrow, Description */}
      <div className="flex items-start gap-3.5 min-w-0">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300 shadow-sm shadow-cyan-950/50 mt-0.5">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 space-y-1">
          <p className="eyebrow text-cyan-300 tracking-wider text-[11px] uppercase font-semibold">
            {eyebrow}
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white truncate">
            {title}
          </h1>
          {description && (
            <p className="max-w-2xl text-xs sm:text-sm leading-relaxed text-slate-400">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Right Side: Top-right administrative status badges & controls */}
      <div className="flex flex-wrap items-center gap-2.5 lg:justify-end shrink-0 pt-1 lg:pt-0">
        {/* Genuine Administrative Status Badges */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-300 shadow-sm">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Admin Verified</span>
        </div>

        <div className="inline-flex items-center px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs font-mono font-semibold text-cyan-300 shadow-sm">
          RBAC Active
        </div>

        {/* Public View & Admin Logout Controls */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-slate-900/60 text-xs font-medium text-slate-300 hover:text-cyan-200 hover:border-cyan-400/40 hover:bg-slate-900 transition"
        >
          ← Public View
        </Link>

        <AdminLogoutButton />

        {/* Page-specific Action Buttons */}
        {children && (
          <div className="flex items-center gap-2 w-full lg:w-auto mt-2 lg:mt-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/10">
            {children}
          </div>
        )}
      </div>
    </header>
  )
}
