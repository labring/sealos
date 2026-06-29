export const getSubmitErrorMessage = (
  error: unknown,
  fallbackMessage: string,
  invalidMessage: string
): string => {
  if (!error || typeof error !== 'object') return fallbackMessage;

  const message = (error as { message?: unknown }).message;
  if (typeof message === 'string' && message) {
    return message === 'invalid' ? invalidMessage : message;
  }

  return getSubmitErrorMessage(Object.values(error)[0], fallbackMessage, invalidMessage);
};
