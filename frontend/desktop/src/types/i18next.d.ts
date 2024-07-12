import 'i18next';

import common from '../../public/locales/zh/common.json';
import cloudProviders from '../../public/locales/zh/cloudProviders.json';
import error from '../../public/locales/zh/error.json';

export interface I18nNamespaces {
  common: typeof common;
  cloudProviders: typeof cloudProviders;
  error: typeof error;
}

export type I18nNsType = (keyof I18nNamespaces)[];

declare module 'i18next' {
  interface CustomTypeOptions {
    returnNull: false;
    defaultNS: ['common', 'cloudProviders', 'error'];
    resources: I18nNamespaces;
  }
}
