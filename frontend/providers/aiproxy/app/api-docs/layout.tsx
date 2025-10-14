import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Proxy API Doc',
  description: 'AI Proxy API Documentation',
  robots: {
    index: process.env.NODE_ENV === 'development',
    follow: false,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
