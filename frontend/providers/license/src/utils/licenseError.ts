const LICENSE_ERROR_CODE_PREFIX = 'LICENSE_VALIDATION_';

export const LICENSE_ERROR_KEYS: Record<number, string> = {
  1: 'generic',
  2: 'expired',
  3: 'clusterIdMismatch',
  4: 'clusterInfoMismatch'
};

export const getLicenseErrorCode = (code?: number) => {
  if (typeof code !== 'number') return undefined;
  const key = LICENSE_ERROR_KEYS[code];
  if (!key) return undefined;
  return `${LICENSE_ERROR_CODE_PREFIX}${key}`;
};

export const getLicenseErrorMessage = (
  t: (key: string) => string,
  options: {
    errorCode?: string | number;
    validationCode?: number;
    fallback?: string;
  }
) => {
  const keyFromErrorCode =
    typeof options.errorCode === 'string' && options.errorCode.startsWith(LICENSE_ERROR_CODE_PREFIX)
      ? options.errorCode
      : undefined;
  const keyFromValidationCode = getLicenseErrorCode(options.validationCode);
  const translationKey = keyFromErrorCode || keyFromValidationCode;

  if (translationKey) {
    const translated = t(translationKey);
    if (translated !== translationKey) return translated;
  }

  return options.fallback || t('LICENSE_VALIDATION_generic');
};
