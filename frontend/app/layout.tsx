import type { Metadata } from 'next'
import './globals.css'
import ContinuousAuthProvider from '@/components/continuous-auth-provider'

export const metadata: Metadata = {
  title: 'Adaptive Zero Trust AI | Security Control Plane',
  description: 'A premium adaptive security control plane for continuous verification, explainable risk, and zero trust policy enforcement.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="bg-background">
      <body className="bg-background text-foreground cyber-grid">
        <ContinuousAuthProvider>
          {children}
        </ContinuousAuthProvider>
      </body>
    </html>
  )
}
