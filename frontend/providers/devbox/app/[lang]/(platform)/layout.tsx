'use client'

import throttle from 'lodash/throttle'
import { useEffect, useState } from 'react'
import { EVENT_NAME } from 'sealos-desktop-sdk'
import { usePathname, useRouter } from '@/i18n'
import { useSearchParams } from 'next/navigation'
import { createSealosApp, sealosApp } from 'sealos-desktop-sdk/app'

import { useLoading } from '@/hooks/useLoading'
import { useConfirm } from '@/hooks/useConfirm'

import { useEnvStore } from '@/stores/env'
import { useGlobalStore } from '@/stores/global'
import { usePriceStore } from '@/stores/price'
import { useRuntimeStore } from '@/stores/runtime'

import { getLangStore, setLangStore } from '@/utils/cookie'
import QueryProvider from '@/components/providers/MyQueryProvider'
import ChakraProvider from '@/components/providers/MyChakraProvider'
import RouteHandlerProvider from '@/components/providers/MyRouteHandlerProvider'

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { Loading } = useLoading()
  const { setEnv, env } = useEnvStore()
  const { setRuntime } = useRuntimeStore()
  const searchParams = useSearchParams()
  const { setSourcePrice } = usePriceStore()
  const [refresh, setRefresh] = useState(false)
  const { setScreenWidth, loading, setLastRoute } = useGlobalStore()
  const { openConfirm, ConfirmChild } = useConfirm({
    title: 'jump_prompt',
    content: 'not_allow_standalone_use'
  })

  // init session
  useEffect(() => {
    const response = createSealosApp()
    ;(async () => {
      try {
        const newSession = JSON.stringify(await sealosApp.getSession())
        const oldSession = localStorage.getItem('session')
        if (newSession && newSession !== oldSession) {
          localStorage.setItem('session', newSession)
          window.location.reload()
        }
        console.log('devbox: app init success')
      } catch (err) {
        console.log('devbox: app is not running in desktop')
        if (!process.env.NEXT_PUBLIC_MOCK_USER) {
          localStorage.removeItem('session')
          openConfirm(() => {
            window.open(`https://${env.sealosDomain}`, '_self')
          })()
        }
      }
    })()
    return response
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setSourcePrice()
    setRuntime()
    setEnv()
    const changeI18n = async (data: any) => {
      const lastLang = getLangStore()
      const newLang = data.currentLanguage
      if (lastLang !== newLang) {
        router.push(pathname, { locale: newLang })
        setLangStore(newLang)
        setRefresh((state) => !state)
      }
    }

    ;(async () => {
      try {
        const lang = await sealosApp.getLanguage()
        changeI18n({
          currentLanguage: lang.lng
        })
      } catch (error) {
        changeI18n({
          currentLanguage: 'en'
        })
      }
    })()

    return sealosApp?.addAppEventListen(EVENT_NAME.CHANGE_I18N, changeI18n)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // add resize event
  useEffect(() => {
    const resize = throttle((e: Event) => {
      const documentWidth = document.documentElement.clientWidth || document.body.clientWidth
      setScreenWidth(documentWidth)
    }, 200)
    window.addEventListener('resize', resize)
    const documentWidth = document.documentElement.clientWidth || document.body.clientWidth
    setScreenWidth(documentWidth)

    return () => {
      window.removeEventListener('resize', resize)
    }
  }, [setScreenWidth])

  // record route
  useEffect(() => {
    return () => {
      setLastRoute(pathname)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    const lang = getLangStore() || 'zh'
    router.push(pathname, { locale: lang })

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, pathname])

  useEffect(() => {
    const page = searchParams.get('page')
    const runtime = searchParams.get('runtime')

    const path = `${page ? `/devbox/${page}` : ''}${runtime ? `?runtime=${runtime}` : ''}`

    router.push(path)
  }, [router, searchParams])

  return (
    <ChakraProvider>
      <QueryProvider>
        <RouteHandlerProvider>
          <ConfirmChild />
          <Loading loading={loading} />
          {children}
        </RouteHandlerProvider>
      </QueryProvider>
    </ChakraProvider>
  )
}
