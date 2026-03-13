import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/useToast';
import { ResponseCode } from '@/types/response';
import { useTranslation } from 'next-i18next';

export interface CronJobOperationOptions {
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
 * Unified error handling Hook for cronjob operations
 *
 * Features:
 * - Automatically manages loading state
 * - Displays Toast or ErrorModal based on error code
 * - Supports success/failure callbacks
 *
 * @example
 * const { executeOperation, loading, errorModalState, closeErrorModal } = useCronJobOperation();
 *
 * const handlePause = async () => {
 *   await executeOperation(
 *     () => pauseCronJob(jobName),
 *     {
 *       successMessage: t('Job Paused'),
 *       onSuccess: () => refetch()
 *     }
 *   );
 * };
 */
export const useCronJobOperation = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errorModalState, setErrorModalState] = useState<ErrorModalState>({
    visible: false,
    title: '',
    content: ''
  });

  /**
   * Wrapper function for executing cronjob operations
   * @param operation Async operation function
   * @param options Configuration options
   * @returns Operation result or null (on error)
   */
  const executeOperation = useCallback(
    async <T = any>(
      operation: () => Promise<T>,
      options: CronJobOperationOptions = {}
    ): Promise<T | null> => {
      const {
        successMessage = t('success'),
        errorMessage = t('submit_error'),
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
        console.error('CronJob operation error:', error);

        const errorCode = error?.code as ResponseCode;
        let errorMsg: string;

        // Handle specific error codes with localized messages
        if (errorCode === ResponseCode.BALANCE_NOT_ENOUGH) {
          errorMsg = t('user_balance_not_enough');
        } else if (errorCode === ResponseCode.FORBIDDEN_CREATE_APP) {
          errorMsg = t('forbidden_create_app');
        } else if (errorCode === ResponseCode.APP_ALREADY_EXISTS) {
          errorMsg = t('app_already_exists');
        } else {
          errorMsg = error?.message || errorMessage;
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
