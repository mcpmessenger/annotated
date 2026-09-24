import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { PwaRegister } from '@/components/PwaRegister'

export const metadata: Metadata = {
  title: "Annotated - Editorial annotations for the web",
  description: "Explore, share, and discuss annotations across the internet. A companion site for Annotated.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Annotated",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
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
    { media: '(prefers-color-scheme: light)', color: '#0B0F19' },
    { media: '(prefers-color-scheme: dark)', color: '#0B0F19' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="antialiased">
        <PwaRegister />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
