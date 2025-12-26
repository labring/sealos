import { toast } from 'sonner';
import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { sealosApp } from 'sealos-desktop-sdk/app';

import { useUserStore } from '@/stores/user';
import { DevboxListItemTypeV2, DevboxDetailTypeV2 } from '@/types/devbox';
import { restartDevbox, startDevbox } from '@/api/devbox';
import { track } from '@sealos/gtm';
import { useErrorMessage } from '@/hooks/useErrorMessage';
import { DevboxStatusEnum } from '@/constants/devbox';

const SPECIAL_ERROR_CODES = {
  BALANCE_NOT_ENOUGH: 402,
  FORBIDDEN: 403
};

export const useControlDevbox = (refetchDevboxData: () => void) => {
  const { isOutStandingPayment } = useUserStore();
  const t = useTranslations();
  const { getErrorMessage, getErrorCode } = useErrorMessage();

  const handleErrorWithSpecialCases = useCallback(
    (error: any, defaultMsg: string) => {
      const errorCode = getErrorCode(error);

      if (errorCode === SPECIAL_ERROR_CODES.BALANCE_NOT_ENOUGH) {
        toast.error(t('user_balance_not_enough_with_action'), {
          duration: 5000,
          action: {
            label: t('go_to_recharge'),
            onClick: () => {
              sealosApp.runEvents('openDesktopApp', {
                appKey: 'system-costcenter',
                query: { openRecharge: 'true' }
              });
            }
          }
        });
      } else if (errorCode === SPECIAL_ERROR_CODES.FORBIDDEN) {
        const errorMsg = getErrorMessage(error, defaultMsg);
        toast.error(errorMsg, { duration: 5000 });
      } else {
        toast.error(getErrorMessage(error, defaultMsg));
      }
    },
    [getErrorMessage, getErrorCode, t]
  );

  const refetchThreeTimes = useCallback(() => {
    refetchDevboxData();
    setTimeout(() => {
      refetchDevboxData();
      setTimeout(() => {
        refetchDevboxData();
      }, 3000);
    }, 3000);
  }, [refetchDevboxData]);

  // TODO: we need a new loading component
  const handleRestartDevbox = useCallback(
    async (devbox: DevboxListItemTypeV2 | DevboxDetailTypeV2) => {
      try {
        if (isOutStandingPayment) {
          toast.error(t('start_outstanding_tips'));
          return;
        }
        await restartDevbox({ devboxName: devbox.name });
        track({
          event: 'deployment_restart',
          module: 'devbox',
          context: 'app'
        });
        toast.success(t('restart_success'));
      } catch (error: any) {
        handleErrorWithSpecialCases(error, 'restart_error');
        console.error(error);
      }
      refetchThreeTimes();
    },
    [refetchThreeTimes, t, isOutStandingPayment, handleErrorWithSpecialCases]
  );

  const handleStartDevbox = useCallback(
    async (devbox: DevboxListItemTypeV2 | DevboxDetailTypeV2) => {
      try {
        if (isOutStandingPayment) {
          toast.error(t('start_outstanding_tips'));
          return;
        }
        const isShutdown = devbox.status.value === DevboxStatusEnum.Shutdown;
        const shouldChangeNetwork =
          isShutdown && devbox.networkType && devbox.networkType !== 'SSHGate';

        await startDevbox({
          devboxName: devbox.name,
          networkType: shouldChangeNetwork ? devbox.networkType : undefined
        });
        toast.success(t('start_success'));
        track({
          event: 'deployment_start',
          module: 'devbox',
          context: 'app'
        });
      } catch (error: any) {
        handleErrorWithSpecialCases(error, 'start_error');
        console.error(error);
      }
      refetchThreeTimes();
    },
    [refetchThreeTimes, t, isOutStandingPayment, handleErrorWithSpecialCases]
  );

  const handleGoToTerminal = useCallback(
    async (devbox: DevboxListItemTypeV2 | DevboxDetailTypeV2) => {
      const defaultCommand = `kubectl exec -it $(kubectl get po -l app.kubernetes.io/name=${devbox.name} -oname) -- sh -c "clear; (bash || ash || sh)"`;
      try {
        sealosApp.runEvents('openDesktopApp', {
          appKey: 'system-terminal',
          query: {
            defaultCommand
          },
          messageData: { type: 'new terminal', command: defaultCommand }
        });
        track({
          event: 'deployment_action',
          event_type: 'terminal_open',
          module: 'devbox',
          context: 'app'
        });
      } catch (error: any) {
        handleErrorWithSpecialCases(error, 'jump_terminal_error');
        console.error(error);
      }
    },
    [handleErrorWithSpecialCases]
  );

  return {
    handleRestartDevbox,
    handleStartDevbox,
    handleGoToTerminal
  };
};
