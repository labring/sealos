'use client'
import { Box, Flex } from '@chakra-ui/react'

import SideBar from '@/components/user/Sidebar'

import { EVENT_NAME } from 'sealos-desktop-sdk'
import { createSealosApp, sealosApp } from 'sealos-desktop-sdk/app'
import { useCallback, useEffect } from 'react'
import { initAppConfig } from '@/api/platform'
import { useI18n } from '@/providers/i18n/i18nContext'
import { useBackendStore } from '@/store/backend'
import { useTranslationClientSide } from '@/app/i18n/client'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { lng } = useI18n()
  const { i18n } = useTranslationClientSide(lng)
  const { setAiproxyBackend, setCurrencySymbol } = useBackendStore()

  const handleI18nChange = useCallback(
    (data: { currentLanguage: string }) => {
      const currentLng = i18n.resolvedLanguage // get the latest resolvedLanguage
      const newLng = data.currentLanguage

      if (currentLng !== newLng) {
        const currentPath = window.location.pathname
        const pathWithoutLang = currentPath.split('/').slice(2).join('/')
        router.push(`/${newLng}/${pathWithoutLang}`)
      }
    },
    [i18n.resolvedLanguage]
  )

  // init session
  useEffect(() => {
    const cleanup = createSealosApp()
    ;(async () => {
      try {
        const newSession = JSON.stringify(await sealosApp.getSession())
        const oldSession = localStorage.getItem('session')
        if (newSession && newSession !== oldSession) {
          localStorage.setItem('session', newSession)
          window.location.reload()
        }
        console.log('aiproxy: app init success')
      } catch (err) {
        console.log('aiproxy: app is not running in desktop')
        if (!process.env.NEXT_PUBLIC_MOCK_USER) {
          localStorage.removeItem('session')
        }
      }
    })()
    return () => {
      if (cleanup && typeof cleanup === 'function') {
        cleanup()
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // init config and language
  useEffect(() => {
    const initConfig = async () => {
      const { aiproxyBackend, currencySymbol } = await initAppConfig()
      setAiproxyBackend(aiproxyBackend)
      setCurrencySymbol(currencySymbol)
    }

    initConfig()

    const initLanguage = async () => {
      const pathLng = pathname.split('/')[1]
      try {
        const lang = await sealosApp.getLanguage()
        if (pathLng !== lang.lng) {
          const pathParts = pathname.split('/')
          pathParts[1] = lang.lng
          router.push(pathParts.join('/'))
          router.refresh()
        }
      } catch (error) {
        if (error instanceof Error) {
          console.debug('Language initialization error:', error.message)
        } else {
          console.debug('Unknown language initialization error:', error)
        }
      }
    }

    initLanguage()

    const cleanup = sealosApp?.addAppEventListen(EVENT_NAME.CHANGE_I18N, handleI18nChange)

    return () => {
      if (cleanup && typeof cleanup === 'function') {
        cleanup()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Flex height="100vh" width="100vw" direction="row">
      <Box w="88px" h="100vh">
        <SideBar />
      </Box>
      {/* Main Content */}
      <Box h="100vh" w="full" flex={1}>
        {children}
      </Box>
    </Flex>
  )
}
