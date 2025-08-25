import { AppConfigType } from './app-config'
// global.d.ts
declare global {
  var AppConfig: AppConfigType | undefined
  /**
   * Type definition for i18n translation functions
   */
  type TranslationFunction = TFunction<'common', undefined>
  // type TranslationFunction<T extends string = string> = (key: T, options?: any) => string;
}

// This export is needed to make the file a module
export {}
