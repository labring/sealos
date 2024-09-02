'use client'

import throttle from 'lodash/throttle'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { EVENT_NAME } from 'sealos-desktop-sdk'
import { createSealosApp, sealosApp } from 'sealos-desktop-sdk/app'

import { useGlobalStore } from '@/stores/global'
import { useLoading } from '@/hooks/useLoading'
import { useConfirm } from '@/hooks/useConfirm'
import {
  getEnv,
  getGlobalNamespace,
  getRuntime,
  getUserPrice,
  SEALOS_DOMAIN
} from '@/stores/static'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { ChakraProvider } from '@/components/providers/ChakraProvider'
import { RouteHandlerProvider } from '@/components/providers/RouteHandlerProvider'
import { getLangStore, setLangStore } from '@/utils/cookie'

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { Loading } = useLoading()
  const [refresh, setRefresh] = useState(false)
  const { setScreenWidth, loading, setLastRoute } = useGlobalStore()
  const { openConfirm, ConfirmChild } = useConfirm({
    title: 'jump_prompt',
    content: 'not_allow_standalone_use'
  })

  useEffect(() => {
    getUserPrice()
    getRuntime()
    getEnv()
    getGlobalNamespace()
    const changeI18n = async (data: any) => {
      const lastLang = getLangStore()
      const newLang = data.currentLanguage
      if (lastLang !== newLang) {
        // router.push(`/${newLang}`)
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
          currentLanguage: 'zh'
        })
      }
    })()

    return sealosApp?.addAppEventListen(EVENT_NAME.CHANGE_I18N, changeI18n)
  }, [])

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
            // NOTE: 这里的SEALOS_DOMAIN可能获取不到
            window.open(`https://${SEALOS_DOMAIN}`, '_self')
          })()
        }
      }
    })()
    return response
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
    // router.push(`/${lang}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, pathname])

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
