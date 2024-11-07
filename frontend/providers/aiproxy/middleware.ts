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

  // 从路径中获取语言设置
  let lng = req.nextUrl.pathname.split('/')[1]

  // 如果路径中没有有效的语言代码，则使用默认语言
  if (!languages.includes(lng)) {
    lng = fallbackLng
  }

  // 处理根路径和语言路径的重定向
  if (
    req.nextUrl.pathname === '/' ||
    languages.some((lang) => req.nextUrl.pathname === `/${lang}`)
  ) {
    const newUrl = new URL(`/${lng}/home`, req.url)
    return NextResponse.redirect(newUrl)
  }

  // 处理其他需要添加语言前缀的路径
  if (!languages.some((loc) => req.nextUrl.pathname.startsWith(`/${loc}`))) {
    const newUrl = new URL(`/${lng}${req.nextUrl.pathname}${req.nextUrl.search}`, req.url)
    return NextResponse.redirect(newUrl)
  }

  return NextResponse.next()
}
