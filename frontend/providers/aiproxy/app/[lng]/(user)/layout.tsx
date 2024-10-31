'use client'
import { Box, Flex } from '@chakra-ui/react'

import SideBar from '@/components/user/Sidebar'

import { EVENT_NAME } from 'sealos-desktop-sdk'
import { createSealosApp, sealosApp } from 'sealos-desktop-sdk/app'
import { useEffect } from 'react'
import { initAppConfig } from '@/api/platform'

export default function UserLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: { lng: string }
}) {
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
    initAppConfig()

    // const changeI18n = async (data: any) => {
    //   const lastLang = getcl()
    //   const newLang = data.currentLanguage
    //   if (lastLang !== newLang) {
    //     router.push(pathname, { locale: newLang })
    //     setLangStore(newLang)
    //     setRefresh((state) => !state)
    //   }
    // }

    // ;(async () => {
    //   try {
    //     const lang = await sealosApp.getLanguage()
    //     changeI18n({
    //       currentLanguage: lang.lng
    //     })
    //   } catch (error) {
    //     changeI18n({
    //       currentLanguage: 'zh'
    //     })
    //   }
    // })()

    // return sealosApp?.addAppEventListen(EVENT_NAME.CHANGE_I18N, changeI18n)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Flex minH="100vh">
      <Box w="88px">
        <SideBar lng={params.lng} />
      </Box>
      {/* Main Content */}
      <Box flex={1}>{children}</Box>
    </Flex>
  )
}
