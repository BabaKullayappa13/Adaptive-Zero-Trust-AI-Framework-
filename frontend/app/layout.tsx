import type { Metadata } from 'next'
import './globals.css'
import ContinuousAuthProvider from '@/components/continuous-auth-provider'

export const metadata: Metadata = {
  title: 'Adaptive Zero Trust AI | Continuous Multi-Factor Authentication',
  description: 'Continuous multi-factor authentication, adaptive trust & risk scoring, Secret PIN verification, Explainable AI, and Hybrid Cloud security.',
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
