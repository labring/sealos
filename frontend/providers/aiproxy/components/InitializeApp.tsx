'use client'

import { EVENT_NAME } from 'sealos-desktop-sdk'
import { createSealosApp, sealosApp } from 'sealos-desktop-sdk/app'
import { useCallback, useEffect } from 'react'
import { initAppConfig } from '@/api/platform'
import { useI18n } from '@/providers/i18n/i18nContext'
import { useBackendStore } from '@/store/backend'
import { useTranslationClientSide } from '@/app/i18n/client'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useSessionStore } from '@/store/session'

export default function InitializeApp() {
  const router = useRouter()
  const pathname = usePathname()
  const { lng } = useI18n()
  const { i18n } = useTranslationClientSide(lng)
  const {
    setAiproxyBackend,
    setCurrencySymbol,
    setDocUrl,
    setIsInvitationActive,
    setInvitationUrl
  } = useBackendStore()

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

  useEffect(() => {
    const cleanupApp = createSealosApp()
    let cleanupEventListener: (() => void) | undefined

    const initApp = async () => {
      try {
        await initLanguage()

        await initSession()

        await initConfig()

        cleanupEventListener = sealosApp?.addAppEventListen(
          EVENT_NAME.CHANGE_I18N,
          handleI18nChange
        )
      } catch (error) {
        console.error('aiproxy: init app error:', error)
      }
    }

    initApp()

    return () => {
      if (cleanupEventListener && typeof cleanupEventListener === 'function') {
        cleanupEventListener()
      }
      if (cleanupApp && typeof cleanupApp === 'function') {
        cleanupApp()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // init language
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
      console.info('aiproxy: init language success')
    } catch (error) {
      if (error instanceof Error) {
        console.debug('aiproxy: init language error:', error.message)
      } else {
        console.debug('aiproxy: unknown init language error:', error)
      }
    }
  }

  // init session
  const initSession = async () => {
    const { setSession } = useSessionStore.getState()

    try {
      const newSession = await sealosApp.getSession()
      const currentSession = useSessionStore.getState().session
      // Compare token from persisted session with new session token
      if (newSession?.token !== currentSession?.token) {
        setSession(newSession)
        window.location.reload()
      }
      console.info('aiproxy: init session success')
    } catch (err) {
      console.info('aiproxy: app is not running in desktop')
      if (!process.env.NEXT_PUBLIC_MOCK_USER) {
        setSession(null)
      }
    }
  }

  // init config
  const initConfig = async () => {
    try {
      const { aiproxyBackend, currencySymbol, docUrl, isInvitationActive, invitationUrl } =
        await initAppConfig()
      setAiproxyBackend(aiproxyBackend)
      setCurrencySymbol(currencySymbol)
      setDocUrl(docUrl)
      setIsInvitationActive(isInvitationActive)
      setInvitationUrl(invitationUrl)
      console.info('aiproxy: init config success')
    } catch (error) {
      console.error('aiproxy: init config error:', error)
    }
  }

  return null
}
