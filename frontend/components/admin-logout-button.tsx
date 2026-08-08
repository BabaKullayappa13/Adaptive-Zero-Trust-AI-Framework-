'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function AdminLogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function logout() {
    setLoading(true)
    await fetch('/api/admin/logout', { method: 'POST', cache: 'no-store' }).catch(() => undefined)
    window.history.replaceState(null, '', '/admin/login')
    router.replace('/admin/login?reason=logout')
    router.refresh()
  }

  return <button type="button" onClick={logout} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-rose-300/20 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:border-rose-300/40 hover:bg-rose-300/10 disabled:cursor-wait disabled:opacity-60"><LogOut className="size-4" />{loading ? 'Signing out…' : 'Admin logout'}</button>
}
