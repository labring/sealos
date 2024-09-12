import { Inter } from 'next/font/google'
import type { Metadata, Viewport } from 'next'

import IntlProvider from '@/components/providers/MyIntlProvider'

import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sealos Devbox',
  description: 'Generated a development and production environment for you',
  icons: [
    {
      url: '/logo.svg',
      href: '/logo.svg'
    }
  ]
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1
}

export default function RootLayout({
  children,
  params: { lang }
}: Readonly<{
  children: React.ReactNode
  params: { lang: string }
}>) {
  return (
    <html lang={lang}>
      <body className={inter.className}>
        <IntlProvider>{children}</IntlProvider>
      </body>
    </html>
  )
}
