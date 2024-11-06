'use client'

import { useEffect } from 'react'
import {
  FallbackNs,
  initReactI18next,
  useTranslation as useTranslationOrg,
  UseTranslationOptions,
  UseTranslationResponse
} from 'react-i18next'
import i18next, { FlatNamespace, KeyPrefix } from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import resourcesToBackend from 'i18next-resources-to-backend'

import { getOptions, languages } from './settings'

const runsOnServerSide = typeof window === 'undefined'

i18next
  .use(initReactI18next)
  .use(LanguageDetector)
  .use(
    resourcesToBackend(
      (language: string, namespace: string) => import(`./locales/${language}/${namespace}.json`)
    )
  )
  .init({
    ...getOptions(),
    lng: undefined, // let detect the language on client side
    detection: {
      order: ['path', 'htmlTag', 'cookie', 'navigator']
    },
    preload: runsOnServerSide ? languages : []
  })

export function useTranslationClientSide<
  Ns extends FlatNamespace,
  KPrefix extends KeyPrefix<FallbackNs<Ns>> = undefined
>(
  lng: string,
  ns?: Ns,
  options?: UseTranslationOptions<KPrefix>
): UseTranslationResponse<FallbackNs<Ns>, KPrefix> {
  const ret = useTranslationOrg(ns, options)
  const { i18n } = ret

  // server side handle
  // if (runsOnServerSide) {
  //   if (lng && i18n.resolvedLanguage !== lng) {
  //     i18n.changeLanguage(lng);
  //   }
  //   return ret;
  // }

  // client side handle
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!lng || i18n.resolvedLanguage === lng) {
      return
    }
    i18n.changeLanguage(lng)
    localStorage.setItem('userLanguage', lng)
  }, [lng, i18n, i18n.resolvedLanguage])

  return ret
}
