import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: "Annotated - Editorial annotations for the web",
  description: "Explore, share, and discuss annotations across the internet. A companion site for Annotated.",
  robots: "index, follow",
  openGraph: {
    title: "Annotated - Editorial annotations for the web",
    description: "Explore, share, and discuss annotations across the internet.",
    type: "website",
    url: "https://annotated-repo.vercel.app",
    images: [
      {
        url: "https://annotated-repo.vercel.app/logo.png",
        width: 128,
        height: 128,
        alt: "Annotated Logo",
      }
    ],
  },
  twitter: {
    card: "summary",
    title: "Annotated - Editorial annotations for the web",
    description: "Explore, share, and discuss annotations across the internet.",
    images: ["https://annotated-repo.vercel.app/logo.png"],
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
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
