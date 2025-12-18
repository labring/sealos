import { useCallback, useState } from 'react';
import { useMessage } from '@sealos/ui';
import { track } from '@sealos/gtm';
import { ResponseCode } from '@/types/response';
import { useTranslation } from 'next-i18next';

/**
 * Options for database operation execution
 */
export interface DBOperationOptions {
  /** Success notification message */
  successMessage?: string;
  /** Error notification message (used when not showing ErrorModal) */
  errorMessage?: string;
  /** Whether to show ErrorModal for special error codes */
  showErrorModal?: boolean;
  /** Callback function on success */
  onSuccess?: () => void;
  /** GTM event name for successful operation */
  eventName?: string;
}

/**
 * Error modal state
 */
interface ErrorModalState {
  visible: boolean;
  title: string;
  content: string;
  errorCode?: ResponseCode;
}

/**
 * Unified error handling Hook for database operations
 * Automatically handles loading, success/error notifications, GTM tracking, and error modal display
 *
 * @example
 * const { executeOperation, loading, errorModalState, closeErrorModal } = useDBOperation();
 *
 * const handleRestart = useCallback(async () => {
 *   await executeOperation(() => restartDB(db), {
 *     successMessage: t('restart_success'),
 *     errorMessage: t('restart_error'),
 *     eventName: 'deployment_restart'
 *   });
 * }, [db, executeOperation, t]);
 */
export const useDBOperation = () => {
  const { t } = useTranslation();
  const { message: toast } = useMessage();
  const [loading, setLoading] = useState(false);
  const [errorModalState, setErrorModalState] = useState<ErrorModalState>({
    visible: false,
    title: '',
    content: ''
  });

  /**
   * Wrapper function for executing database operations
   * Handles loading, success/error notifications, GTM tracking, and error modal display
   */
  const executeOperation = useCallback(
    async <T = any>(
      operation: () => Promise<T>,
      options: DBOperationOptions = {}
    ): Promise<T | null> => {
      const {
        successMessage = '',
        errorMessage = '',
        showErrorModal = true,
        onSuccess,
        eventName
      } = options;

      try {
        setLoading(true);
        const result = await operation();

        // Success notification
        if (successMessage) {
          toast({
            title: successMessage,
            status: 'success'
          });
        }

        // GTM event tracking
        if (eventName) {
          track(eventName as any, {
            module: 'database'
          });
        }

        onSuccess?.();
        return result;
      } catch (error: any) {
        console.error('DB Operation Error:', error);

        const errorCode = error?.code as ResponseCode;
        let errorMsg: string;

        // Handle specific error codes with localized messages
        if (errorCode === ResponseCode.BALANCE_NOT_ENOUGH) {
          errorMsg = t('user_balance_not_enough');
          track(
            'paywall_triggered' as any,
            {
              module: 'database',
              type: 'insufficient_balance'
            } as any
          );
        } else if (errorCode === ResponseCode.FORBIDDEN_CREATE_APP) {
          errorMsg = t('forbidden_create_app');
          track(
            'error_occurred' as any,
            {
              module: 'database',
              error_code: 'FORBIDDEN_CREATE_APP'
            } as any
          );
        } else if (errorCode === ResponseCode.APP_ALREADY_EXISTS) {
          errorMsg = t('app_already_exists');
          track(
            'error_occurred' as any,
            {
              module: 'database',
              error_code: 'APP_ALREADY_EXISTS'
            } as any
          );
        } else {
          errorMsg = error?.message || errorMessage;
          if (errorCode) {
            track(
              'error_occurred' as any,
              {
                module: 'database',
                error_code: String(errorCode)
              } as any
            );
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
