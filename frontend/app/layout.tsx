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
    <html lang="en" className="bg-[#060b14]">
      <body className="bg-[#060b14] text-foreground cyber-grid">
        {children}
      </body>
    </html>
  )
}
