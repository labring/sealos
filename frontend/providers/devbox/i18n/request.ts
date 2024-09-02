import { routing } from './routing'
import { notFound } from 'next/navigation'
import { getRequestConfig } from 'next-intl/server'

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!routing.locales.includes(locale as any)) notFound()

  return {
    messages: (await import(`../message/${locale}.json`)).default
  }
})
