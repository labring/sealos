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
    if (typeof error === 'number' && Number.isFinite(error)) {
      return error;
    }

    if (typeof error === 'string') {
      const code = Number(error.split(':')[0]);
      return Number.isFinite(code) ? code : undefined;
    }

    if (!error || typeof error !== 'object') {
      return undefined;
    }

    const possibleCode = [
      error.code,
      error.status,
      error.statusCode,
      error.response?.status,
      error.response?.statusCode,
      error.response?.data?.code
    ].find(
      (code) =>
        (typeof code === 'number' && Number.isFinite(code)) ||
        (typeof code === 'string' && /^\d+$/.test(code))
    );

    if (possibleCode !== undefined) {
      return Number(possibleCode);
    }

    if (typeof error.message === 'string') {
      const code = Number(error.message.split(':')[0]);
      return Number.isFinite(code) ? code : undefined;
    }

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
