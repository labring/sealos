import acceptLanguage from 'accept-language';
import { NextRequest, NextResponse } from 'next/server';

import { fallbackLng, languages } from '@/app/i18n/settings';

acceptLanguage.languages(languages);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)'
    },

    // 排除 assets路径
    {
      source: '/((?!assets/).*)'
    },

    // 排除特定文件
    '/((?!sw\\.js).*)',
    '/((?!site\\.webmanifest).*)',

    // 排除以特定字符串开头的路径
    '/((?!icon/).*)',
    '/((?!chrome/).*)'
  ]
};

export function middleware(req: NextRequest): NextResponse {
  // static file  /public/xxx.svg
  if (
    req.nextUrl.pathname.endsWith('.svg') ||
    req.nextUrl.pathname.endsWith('.png') ||
    req.nextUrl.pathname.endsWith('.ico')
  ) {
    return NextResponse.next();
  }

  if (req.nextUrl.pathname.indexOf('icon') > -1 || req.nextUrl.pathname.indexOf('chrome') > -1)
    return NextResponse.next();

  let lng: string | undefined | null;
  lng = acceptLanguage.get(req.headers.get('Accept-Language'));
  if (!lng) lng = fallbackLng;

  if (req.nextUrl.pathname === '/' || req.nextUrl.pathname === '/zh') {
    const newUrl = new URL(`/${lng}/home`, req.url);
    return NextResponse.redirect(newUrl);
  }

  // Redirect if lng in path is not supported
  if (
    !languages.some((loc) => req.nextUrl.pathname.startsWith(`/${loc}`)) &&
    !req.nextUrl.pathname.startsWith('/_next')
  ) {
    const newUrl = new URL(`/${lng}${req.nextUrl.pathname}${req.nextUrl.search}`, req.url);
    return NextResponse.redirect(newUrl);
  }

  return NextResponse.next();
}
