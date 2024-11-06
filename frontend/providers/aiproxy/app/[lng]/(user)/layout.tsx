'use client'
import { Box, Flex } from '@chakra-ui/react'

import SideBar from '@/components/user/Sidebar'

import { EVENT_NAME } from 'sealos-desktop-sdk'
import { createSealosApp, sealosApp } from 'sealos-desktop-sdk/app'
import { useEffect } from 'react'
import { initAppConfig } from '@/api/platform'
import { useI18n } from '@/providers/i18n/i18nContext'
import { useBackendStore } from '@/store/backend'
import { useTranslationClientSide } from '@/app/i18n/client'

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { lng } = useI18n()
  const { i18n } = useTranslationClientSide(lng)
  const { setAiproxyBackend } = useBackendStore()
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
        }
      }
    })()
    return response
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const initConfig = async () => {
      const { aiproxyBackend } = await initAppConfig()
      setAiproxyBackend(aiproxyBackend)
    }

    initConfig()

    const changeI18n = async (data: any) => {
      try {
        const { lng } = await sealosApp.getLanguage()
        i18n.changeLanguage(lng)
      } catch (error) {
        i18n.changeLanguage('zh')
      }
    }

    ;(async () => {
      try {
        const lang = await sealosApp.getLanguage()
        i18n.changeLanguage(lang.lng)
      } catch (error) {
        i18n.changeLanguage('zh')
      }
    })()

    return sealosApp?.addAppEventListen(EVENT_NAME.CHANGE_I18N, changeI18n)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Flex height="100vh" width="100vw" direction="row">
      <Box w="88px" h="100vh">
        <SideBar lng={lng} />
      </Box>
      {/* Main Content */}
      <Box h="100vh" w="full" flex={1}>
        {children}
      </Box>
    </Flex>
  )
}
