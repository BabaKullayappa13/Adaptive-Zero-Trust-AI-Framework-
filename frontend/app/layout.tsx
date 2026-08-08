import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Zero Trust AI Framework',
  description: 'Adaptive continuous multi-factor authentication with AI-powered risk detection',
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
