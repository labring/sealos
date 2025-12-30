import { useToast } from '@/hooks/useToast';
import { useState, useCallback } from 'react';
import { useTranslation } from 'next-i18next';
import { ResponseCode } from '@/types/response';

interface ErrorModalState {
  isOpen: boolean;
  title: string;
  errorCode?: ResponseCode;
}

interface UseTemplateOperationOptions {
  onSuccess?: () => void;
  onError?: (error: any) => void;
  successMessage?: string;
  errorMessage?: string;
}

export const useTemplateOperation = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [errorModalState, setErrorModalState] = useState<ErrorModalState>({
    isOpen: false,
    title: ''
  });

  const executeOperation = useCallback(
    async <T>(
      operation: () => Promise<T>,
      options: UseTemplateOperationOptions = {}
    ): Promise<T | undefined> => {
      const {
        onSuccess,
        onError,
        successMessage = t('success'),
        errorMessage = t('request_failed')
      } = options;

      setLoading(true);

      try {
        const result = await operation();

        // Success notification
        toast({
          title: successMessage,
          status: 'success'
        });

        onSuccess?.();
        return result;
      } catch (error: any) {
        console.error('Template operation error:', error);

        const errorCode = error?.code as ResponseCode;
        const errorMsg = error?.message || errorMessage;

        // Handle special error codes with ErrorModal
        if (
          errorCode === ResponseCode.BALANCE_NOT_ENOUGH ||
          errorCode === ResponseCode.FORBIDDEN_CREATE_APP ||
          errorCode === ResponseCode.APP_ALREADY_EXISTS
        ) {
          // Show ErrorModal for special errors
          let title = '';
          switch (errorCode) {
            case ResponseCode.BALANCE_NOT_ENOUGH:
              title = t('user_balance_not_enough');
              break;
            case ResponseCode.FORBIDDEN_CREATE_APP:
              title = t('forbidden_create_app');
              break;
            case ResponseCode.APP_ALREADY_EXISTS:
              title = t('app_already_exists');
              break;
          }

          setErrorModalState({
            isOpen: true,
            title,
            errorCode
          });
        } else {
          // Show toast for normal errors
          toast({
            title: errorMsg,
            status: 'error'
          });
        }

        onError?.(error);
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [toast, t]
  );

  const closeErrorModal = useCallback(() => {
    setErrorModalState({
      isOpen: false,
      title: ''
    });
  }, []);

  return {
    loading,
    executeOperation,
    errorModalState,
    closeErrorModal
  };
};
