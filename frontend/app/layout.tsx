import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Adaptive Zero Trust AI | Security Operations',
  description: 'Premium continuous authentication, adaptive policy enforcement, and explainable security intelligence.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="bg-slate-950">
      <body className="bg-slate-950 text-foreground cyber-grid">
        {children}
      </body>
    </html>
  )
}
