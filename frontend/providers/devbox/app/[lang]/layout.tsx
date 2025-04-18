import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import IntlProvider from '@/components/providers/MyIntlProvider';
import QueryProvider from '@/components/providers/MyQueryProvider';
import { enableMapSet } from 'immer';
import './globals.css';
import '@sealos/driver/src/driver.css';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Sealos Devbox',
  description: 'Generated a development and production environment for you',
  icons: [
    {
      url: '/logo.svg',
      href: '/logo.svg'
    }
  ]
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1
};
enableMapSet();
export default function RootLayout({
  children,

  params: { lang },
  ...props
}: Readonly<{
  children: React.ReactNode;
  params: { lang: string };
}>) {
  const scripts: { src: string }[] = JSON.parse(process.env.CUSTOM_SCRIPTS ?? '[]');
  return (
    <html lang={lang}>
      <body className={inter.className}>
        <IntlProvider>
          <QueryProvider>{children}</QueryProvider>
        </IntlProvider>
        {scripts.map((script, i) => (
          <Script key={i} {...script} />
        ))}
      </body>
    </html>
  );
}
