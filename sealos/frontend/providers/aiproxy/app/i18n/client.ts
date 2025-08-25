'use client'

import {
  FallbackNs,
  initReactI18next,
  useTranslation,
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
      order: ['path', 'htmlTag', 'navigator']
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
  const ret = useTranslation(ns, options)

  if (lng && lng !== i18next.resolvedLanguage) {
    i18next.changeLanguage(lng)
  }

  return ret
}
