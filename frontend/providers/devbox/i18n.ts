import { notFound } from 'next/navigation'
import { getRequestConfig } from 'next-intl/server'
import { createSharedPathnamesNavigation } from 'next-intl/navigation'

// Can be imported from a shared config
const locales = ['en', 'zh']

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) notFound()

  return {
    messages: (await import(`./message/${locale}.json`)).default
  }
})

export const { Link, redirect, usePathname, useRouter } = createSharedPathnamesNavigation()
