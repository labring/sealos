import { createSharedPathnamesNavigation } from 'next-intl/navigation';
import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

// TODO: update next-intl
// Can be imported from a shared config
const locales = ['en', 'zh'];

export default getRequestConfig(async ({ locale, ...props }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) {
    return notFound();
  }
  return {
    locale,
    messages: (await import(`./message/${locale}.json`)).default
  };
});

export const { Link, redirect, usePathname, useRouter } = createSharedPathnamesNavigation();
