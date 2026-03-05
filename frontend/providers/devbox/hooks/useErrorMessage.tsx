import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { getErrText } from '@/utils/tools';

/**
 * Hook to get translated error messages
 * @returns getErrorMessage function that translates error messages
 */
export const useErrorMessage = () => {
  const t = useTranslations();

  const getErrorCode = useCallback((error: any): number | undefined => {
    if (typeof error === 'number') return error;

    if (typeof error === 'string') {
      const match = error.match(/^(\d+):/);
      if (match) {
        const parsed = Number(match[1]);
        return Number.isFinite(parsed) ? parsed : undefined;
      }
      return undefined;
    }

    if (typeof error?.response?.status === 'number') return error.response.status;
    if (typeof error?.code === 'number') return error.code;
    if (typeof error?.status === 'number') return error.status;

    return undefined;
  }, []);

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

  return { getErrorMessage, getErrorCode };
};
