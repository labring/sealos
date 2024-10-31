import { dir } from 'i18next'
import type { Metadata } from 'next'

import { useTranslationServerSide } from '@/app/i18n/server'
import { fallbackLng, languages } from '@/app/i18n/settings'
import ChakraProviders from '@/providers/chakra/providers'
import { I18nProvider } from '@/providers/i18n/i18nContext'

import './globals.css'
import 'react-day-picker/dist/style.css'

import { EVENT_NAME } from 'sealos-desktop-sdk'
import { createSealosApp, sealosApp } from 'sealos-desktop-sdk/app'
import QueryProvider from '@/providers/chakra/QueryProvider'

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
    title: t('title'),
    description: t('description')
  }
}

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode
  params: {
    lng: string
  }
}>): Promise<React.JSX.Element> {
  const { lng } = await params
  return (
    <html lang={lng} dir={dir(lng)}>
      <body>
        <I18nProvider lng={lng}>
          <ChakraProviders>
            <QueryProvider>{children}</QueryProvider>
          </ChakraProviders>
        </I18nProvider>
      </body>
    </html>
  )
}
