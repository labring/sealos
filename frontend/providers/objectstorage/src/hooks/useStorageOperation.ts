import { useState, useCallback } from 'react';
import { useTranslation } from 'next-i18next';
import { useToast as useChakraToast } from '@chakra-ui/react';
import { ResponseCode } from '@/types/response';

interface ErrorModalState {
  isOpen: boolean;
  errorCode?: number;
  errorMessage?: string;
}

interface UseStorageOperationOptions {
  onSuccess?: () => void;
  onError?: (error: any) => void;
  successMessage?: string;
}

export const useStorageOperation = () => {
  const { t } = useTranslation('common');
  const toast = useChakraToast();
  const [loading, setLoading] = useState(false);
  const [errorModalState, setErrorModalState] = useState<ErrorModalState>({
    isOpen: false
  });

  const executeOperation = useCallback(
    async (operation: () => Promise<any>, options: UseStorageOperationOptions = {}) => {
      const { onSuccess, onError, successMessage } = options;

      setLoading(true);
      try {
        const result = await operation();
        setLoading(false);

        if (successMessage) {
          toast({
            title: successMessage,
            status: 'success',
            duration: 3000
          });
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
          errorCode === ResponseCode.BALANCE_NOT_ENOUGH ||
          errorCode === ResponseCode.FORBIDDEN_CREATE_APP ||
          errorCode === ResponseCode.APP_ALREADY_EXISTS
        ) {
          setErrorModalState({
            isOpen: true,
            errorCode,
            errorMessage: t(errorMessage)
          });
        } else {
          toast({
            title: t(errorMessage) || errorMessage,
            status: 'error',
            duration: 5000
          });
        }

        if (onError) {
          onError(error);
        }

        throw error;
      }
    },
    [toast, t]
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
