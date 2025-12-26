import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

const BALANCE_NOT_ENOUGH = 402;
const FORBIDDEN_CREATE_APP = 403;
const APP_ALREADY_EXISTS = 409;

interface ErrorModalState {
  isOpen: boolean;
  errorCode?: number;
  errorMessage?: string;
}

interface UseDevboxOperationOptions {
  onSuccess?: () => void;
  onError?: (error: any) => void;
  successMessage?: string;
}

export const useDevboxOperation = () => {
  const t = useTranslations();
  const [loading, setLoading] = useState(false);
  const [errorModalState, setErrorModalState] = useState<ErrorModalState>({
    isOpen: false
  });

  const executeOperation = useCallback(
    async (operation: () => Promise<any>, options: UseDevboxOperationOptions = {}) => {
      const { onSuccess, onError, successMessage } = options;

      setLoading(true);
      try {
        const result = await operation();
        setLoading(false);

        if (successMessage) {
          toast.success(successMessage);
        }

        if (onSuccess) {
          onSuccess();
        }

        return result;
      } catch (error: any) {
        setLoading(false);
        console.log('Operation error:', error);

        const errorCode = error?.code;
        const errorMessage = error?.message || t('request_failed');

        if (
          errorCode === BALANCE_NOT_ENOUGH ||
          errorCode === FORBIDDEN_CREATE_APP ||
          errorCode === APP_ALREADY_EXISTS
        ) {
          setErrorModalState({
            isOpen: true,
            errorCode,
            errorMessage: t(errorMessage) || errorMessage
          });
        } else {
          toast.error(t(errorMessage) || errorMessage);
        }

        if (onError) {
          onError(error);
        }

        throw error;
      }
    },
    [t]
  );

  const closeErrorModal = useCallback(() => {
    setErrorModalState({
      isOpen: false
    });
  }, []);

  return {
    loading,
    executeOperation,
    errorModalState,
    closeErrorModal
  };
};
