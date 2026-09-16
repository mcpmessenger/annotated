import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: "Annotated — Editorial annotations for the web",
  description: "Explore, share, and discuss annotations across the internet. A companion site for Annotated.com.",
  robots: "index, follow",
  openGraph: {
    title: "Annotated — Editorial annotations for the web",
    description: "Explore, share, and discuss annotations across the internet.",
    type: "website",
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
