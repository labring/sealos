import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/useToast';
import { ResponseCode } from '@/types/response';
import { useTranslation } from 'next-i18next';
import { track } from '@sealos/gtm';

export interface AppOperationOptions {
  successMessage?: string;
  errorMessage?: string;
  showErrorModal?: boolean;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export interface ErrorModalState {
  visible: boolean;
  title: string;
  content: string;
  errorCode?: ResponseCode;
}

/**
 * Unified error handling Hook for application operations
 *
 * Features:
 * - Automatically manages loading state
 * - Displays Toast or ErrorModal based on error code
 * - Integrates GTM event tracking
 * - Supports success/failure callbacks
 *
 * @example
 * const { executeOperation, loading, errorModalState, closeErrorModal } = useAppOperation();
 *
 * const handlePause = async () => {
 *   await executeOperation(
 *     () => pauseAppByName(appName),
 *     {
 *       successMessage: t('App Paused'),
 *       onSuccess: () => refetch()
 *     }
 *   );
 * };
 */
export const useAppOperation = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errorModalState, setErrorModalState] = useState<ErrorModalState>({
    visible: false,
    title: '',
    content: ''
  });

  /**
   * Wrapper function for executing application operations
   * @param operation Async operation function
   * @param options Configuration options
   * @returns Operation result or null (on error)
   */
  const executeOperation = useCallback(
    async <T = any>(
      operation: () => Promise<T>,
      options: AppOperationOptions = {}
    ): Promise<T | null> => {
      const {
        successMessage = t('success'),
        errorMessage = t('Submit Error'),
        showErrorModal = true,
        onSuccess,
        onError
      } = options;

      try {
        setLoading(true);
        const result = await operation();

        // Success notification
        toast({
          title: successMessage,
          status: 'success'
        });

        onSuccess?.();
        return result;
      } catch (error: any) {
        console.error('App operation error:', error);

        const errorCode = error?.code as ResponseCode;
        let errorMsg: string;

        // Handle specific error codes with localized messages
        if (errorCode === ResponseCode.BALANCE_NOT_ENOUGH) {
          errorMsg = t('user_balance_not_enough');
          track('paywall_triggered', {
            module: 'applaunchpad',
            type: 'insufficient_balance'
          });
        } else if (errorCode === ResponseCode.FORBIDDEN_CREATE_APP) {
          errorMsg = t('forbidden_create_app');
          track('error_occurred', {
            module: 'applaunchpad',
            error_code: 'FORBIDDEN_CREATE_APP'
          });
        } else if (errorCode === ResponseCode.APP_ALREADY_EXISTS) {
          errorMsg = t('app_already_exists');
          track('error_occurred', {
            module: 'applaunchpad',
            error_code: 'APP_ALREADY_EXISTS'
          });
        } else {
          errorMsg = error?.message || errorMessage;
          if (errorCode) {
            track('error_occurred', {
              module: 'applaunchpad',
              error_code: String(errorCode)
            });
          }
        }

        // Special error codes: display ErrorModal
        if (
          showErrorModal &&
          (errorCode === ResponseCode.BALANCE_NOT_ENOUGH ||
            errorCode === ResponseCode.FORBIDDEN_CREATE_APP ||
            errorCode === ResponseCode.APP_ALREADY_EXISTS)
        ) {
          setErrorModalState({
            visible: true,
            title: errorMessage,
            content: errorMsg,
            errorCode: errorCode
          });
        } else {
          // Normal errors: display toast
          toast({
            title: errorMsg,
            status: 'error'
          });
        }

        onError?.(error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [t, toast]
  );

  /**
   * Close error modal
   */
  const closeErrorModal = useCallback(() => {
    setErrorModalState({
      visible: false,
      title: '',
      content: ''
    });
  }, []);

  return {
    executeOperation,
    loading,
    errorModalState,
    closeErrorModal
  };
};
