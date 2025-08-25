import { t as T_ } from 'i18next';
import { useTranslation } from 'next-i18next';

export type keyword = Exclude<
  Parameters<typeof T_>[0],
  string | TemplateStringsArray | string[]
>[number];

export function assembleTranslate(key: Array<keyword>, language: string) {
  const { t } = useTranslation();
  return key.map((item) => t(item)).join(language === 'en' ? ' ' : '');
}
