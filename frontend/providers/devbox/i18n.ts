import { createSharedPathnamesNavigation } from 'next-intl/navigation';
import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

// TODO: update next-intl
// Can be imported from a shared config
const locales = ['en', 'zh'] as const;

export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale = locale || 'en';

  if (!locales.includes(resolvedLocale as (typeof locales)[number])) {
    notFound();
  }

  return {
    messages: (await import(`./message/${resolvedLocale}.json`)).default
  };
});

export const { Link, redirect, usePathname, useRouter } = createSharedPathnamesNavigation();
