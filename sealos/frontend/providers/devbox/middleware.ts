import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'zh'],
  // Used when no locale matches
  defaultLocale: 'en'
});

export const config = {
  // Match only internationalized pathnames
  // matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|fonts|public).*)']
  matcher: ['/', '/(zh|en)/:path*']
};
