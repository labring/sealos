import Script from 'next/script';
import { enableMapSet } from 'immer';
import { GeistSans } from 'geist/font/sans';
import { Fira_Code } from 'next/font/google';
import type { Metadata, Viewport } from 'next';

import IntlProvider from '@/components/providers/MyIntlProvider';
import QueryProvider from '@/components/providers/MyQueryProvider';

import './globals.css';
import 'react-day-picker/style.css';
import '@sealos/driver/src/driver.css';

export const metadata: Metadata = {
  title: 'Sealos DevBox',
  description: 'Generated a development and production environment for you',
  icons: [
    {
      url: '/logo.svg',
      href: '/logo.svg'
    }
  ]
};

const FiraCode = Fira_Code({
  subsets: ['latin'],
  variable: '--font-fira-code'
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1
};

enableMapSet();

export default function RootLayout({
  children,
  params: { lang }
}: Readonly<{
  children: React.ReactNode;
  params: { lang: string };
}>) {
  const scripts: { src: string }[] = JSON.parse(process.env.CUSTOM_SCRIPTS ?? '[]');
  return (
    <html lang={lang} className={`${GeistSans.variable} ${FiraCode.variable}`}>
      <body>
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
