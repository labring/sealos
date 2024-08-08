'use client'

import { useEffect } from 'react'
import throttle from 'lodash/throttle'
import { createSealosApp, sealosApp } from 'sealos-desktop-sdk/app'

import { useEnvStore } from '@/store/env'
import { useGlobalStore } from '@/store/global'
import { useLoading } from '@/hooks/useLoading'
import { useConfirm } from '@/hooks/useConfirm'
import { QueryProvider } from '@/components/providers/queryProvider'
import { ChakraProvider } from '@/components/providers/chakraProvider'
import { RouteHandlerProvider } from '@/components/providers/routeHandlerProvider'

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { Loading } = useLoading()
  const { systemEnv, initSystemEnv } = useEnvStore()
  const { setScreenWidth, loading } = useGlobalStore()
  const { openConfirm, ConfirmChild } = useConfirm({
    title: 'jump_prompt',
    content: 'not_allow_standalone_use'
  })

  // init app
  useEffect(() => {
    const response = createSealosApp()
    ;(async () => {
      const { domain } = await initSystemEnv()
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
            window.open(`https://${domain}`, '_self')
          })()
        }
      }
    })()
    return response
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

  // TODO: add i18n init

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
