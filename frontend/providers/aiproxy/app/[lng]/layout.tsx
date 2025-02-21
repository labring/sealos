import { dir } from 'i18next'
import type { Metadata } from 'next'

import { useTranslationServerSide } from '@/app/i18n/server'
import { fallbackLng, languages } from '@/app/i18n/settings'
import ChakraProviders from '@/providers/chakra/providers'
import { I18nProvider } from '@/providers/i18n/i18nContext'
import QueryProvider from '@/providers/tanstack-query/QueryProvider'
import InitializeApp from '@/components/InitializeApp'

import './globals.css'
import 'react-day-picker/dist/style.css'

export async function generateStaticParams(): Promise<{ lng: string }[]> {
  return languages.map((lng) => ({ lng }))
}

export async function generateMetadata({
  params
}: {
  params: {
    lng: string
  }
}): Promise<Metadata> {
  let { lng } = await params
  if (languages.indexOf(lng) < 0) lng = fallbackLng
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { t } = await useTranslationServerSide(lng, 'common')
  return {
    icons: {
      icon: '/favicon.svg'
    },
    title: t('title'),
    description: t('description')
  }
}

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ lng: string }>
}>): Promise<React.JSX.Element> {
  const lng = (await params).lng
  return (
    <html lang={lng} dir={dir(lng)}>
      <body>
        <I18nProvider lng={lng}>
          <ChakraProviders>
            <QueryProvider>
              <InitializeApp />
              {children}
            </QueryProvider>
          </ChakraProviders>
        </I18nProvider>
      </body>
    </html>
  )
}
