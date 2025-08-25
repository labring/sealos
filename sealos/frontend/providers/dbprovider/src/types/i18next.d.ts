import 'i18next';
import common from '../../public/locales/zh/common.json';

export interface I18nNamespaces {
  common: typeof common;
}

export type I18nNsType = (keyof I18nNamespaces)[];

export type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type ParseKeys<Ns extends keyof I18nNamespaces = keyof I18nNamespaces> = {
  [K in Ns]: `${K}:${NestedKeyOf<I18nNamespaces[K]>}`;
}[Ns];

export type I18nKeyFunction = {
  <Key extends ParseKeys>(key: Key): Key;
};

export type I18nCommonKey = NestedKeyOf<I18nNamespaces['common']>;

declare module 'i18next' {
  interface CustomTypeOptions {
    returnNull: false;
    defaultNS: ['common'];
    resources: I18nNamespaces;
  }
}
