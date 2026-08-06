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
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}
