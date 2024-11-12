import acceptLanguage from 'accept-language'
import { NextRequest, NextResponse } from 'next/server'

import { fallbackLng, languages } from '@/app/i18n/settings'

acceptLanguage.languages(languages)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'
  ]
}

export function middleware(req: NextRequest): NextResponse {
  // static file  /public/xxx.svg
  if (
    req.nextUrl.pathname.endsWith('.svg') ||
    req.nextUrl.pathname.endsWith('.png') ||
    req.nextUrl.pathname.endsWith('.ico')
  ) {
    return NextResponse.next()
  }

  if (req.nextUrl.pathname.indexOf('icon') > -1 || req.nextUrl.pathname.indexOf('chrome') > -1) {
    return NextResponse.next()
  }

  // get language from pathname
  let lng = req.nextUrl.pathname.split('/')[1]

  // if pathname does not contain valid language code, use fallback language
  if (!languages.includes(lng)) {
    lng = fallbackLng
  }

  // handle root path and language path redirect
  if (
    req.nextUrl.pathname === '/' ||
    languages.some((lang) => req.nextUrl.pathname === `/${lang}`)
  ) {
    const newUrl = new URL(`/${lng}/home`, req.url)
    return NextResponse.redirect(newUrl)
  }

  // handle other paths that need to add language prefix
  if (!languages.some((loc) => req.nextUrl.pathname.startsWith(`/${loc}`))) {
    const newUrl = new URL(`/${lng}${req.nextUrl.pathname}${req.nextUrl.search}`, req.url)
    return NextResponse.redirect(newUrl)
  }

  return NextResponse.next()
}
