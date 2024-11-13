import { FallbackNs } from 'react-i18next';
import { initReactI18next } from 'react-i18next/initReactI18next';
import { createInstance, FlatNamespace, i18n, KeyPrefix, TFunction } from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';

import { getOptions } from './settings';

const initI18next = async (lng: string, ns: string | string[]): Promise<i18n> => {
  // on server side we create a new instance for each render, because during compilation everything seems to be executed in parallel
  const i18nInstance = createInstance();
  await i18nInstance
    .use(initReactI18next)
    .use(
      resourcesToBackend(
        (language: string, namespace: string) => import(`./locales/${language}/${namespace}.json`)
      )
    )
    .init(getOptions(lng, ns));
  return i18nInstance;
};

export async function useTranslationServerSide<
  Ns extends FlatNamespace,
  KPrefix extends KeyPrefix<FallbackNs<Ns>> = undefined
>(
  lng: string,
  ns?: Ns,
  options: { keyPrefix?: KPrefix } = {}
): Promise<{ t: TFunction; i18n: i18n }> {
  const i18nextInstance = await initI18next(
    lng,
    Array.isArray(ns) ? ns : [ns as string].filter(Boolean)
  );
  return {
    // ns default is translation.json
    t: i18nextInstance.getFixedT(lng, ns, options.keyPrefix),
    i18n: i18nextInstance
  };
}
