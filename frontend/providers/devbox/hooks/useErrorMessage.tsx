import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { getErrText } from '@/utils/tools';

/**
 * Hook to get translated error messages
 * @returns getErrorMessage function that translates error messages
 */
export const useErrorMessage = () => {
  const t = useTranslations();

  const getErrorMessage = useCallback(
    (error: any, defaultMsg: string) => {
      const errText = getErrText(error, defaultMsg);
      const translated = t(errText);
      return translated !== errText
        ? translated
        : typeof error === 'string'
          ? error
          : error.message || t(defaultMsg);
    },
    [t]
  );

  return { getErrorMessage };
};
