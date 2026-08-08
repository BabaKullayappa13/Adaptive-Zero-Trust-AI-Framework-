'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOut, Settings } from 'lucide-react'

interface NavbarProps {
  user: any
  onLogout: () => void
}

export default function Navbar({ user, onLogout }: NavbarProps) {
  const router = useRouter()

  const handleLogout = () => {
    onLogout()
    router.push('/')
  }

  return (
    <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link href="/dashboard" className="text-2xl font-bold text-primary">
          🔐 Zero Trust AI
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-foreground hover:text-primary transition font-medium">
            Dashboard
          </Link>
          <Link href="/security" className="text-foreground hover:text-primary transition font-medium">
            Security
          </Link>
          <Link href="/policies" className="text-foreground hover:text-primary transition font-medium">
            Policies
          </Link>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary flex items-center justify-center">
              <span className="text-sm font-bold text-primary">{user?.email?.[0]?.toUpperCase()}</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-foreground truncate">{user?.email}</p>
              <p className="text-xs text-slate-400">User</p>
            </div>
          </div>

          {/* Settings Button */}
          <button
            type="button"
            onClick={() => router.push('/security')}
            className="p-2 hover:bg-slate-800 rounded-lg transition"
            title="Security settings"
            aria-label="Open security settings"
          >
            <Settings size={20} className="text-slate-400" />
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-red-900/20 rounded-lg transition text-red-400"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </nav>
  )
}
