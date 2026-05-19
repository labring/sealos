import { toast } from 'sonner';
import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { sealosApp } from 'sealos-desktop-sdk/app';

import { useUserStore } from '@/stores/user';
import { DevboxListItemTypeV2, DevboxDetailTypeV2 } from '@/types/devbox';
import { restartDevbox, startDevbox } from '@/api/devbox';
import { track } from '@sealos/gtm';
import { useErrorMessage } from '@/hooks/useErrorMessage';
import { useConfirm } from '@/hooks/useConfirm';

export const useControlDevbox = (refetchDevboxData: () => void) => {
  const { isOutStandingPayment } = useUserStore();
  const t = useTranslations();
  const { getErrorMessage } = useErrorMessage();
  const { openConfirm, ConfirmChild: RestartConfirmChild } = useConfirm({
    title: 'prompt',
    content: 'confirm_restart_devbox',
    confirmText: 'restart',
    cancelText: 'cancel'
  });

  const refetchThreeTimes = useCallback(() => {
    refetchDevboxData();
    setTimeout(() => {
      refetchDevboxData();
      setTimeout(() => {
        refetchDevboxData();
      }, 3000);
    }, 3000);
  }, [refetchDevboxData]);

  const restartDevboxWithFeedback = useCallback(
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
        toast.error(getErrorMessage(error, 'restart_error'));
        console.error(error);
      }
      refetchThreeTimes();
    },
    [refetchThreeTimes, t, isOutStandingPayment, getErrorMessage]
  );

  const handleRestartDevbox = useCallback(
    (devbox: DevboxListItemTypeV2 | DevboxDetailTypeV2) => {
      openConfirm(() => restartDevboxWithFeedback(devbox))();
    },
    [openConfirm, restartDevboxWithFeedback]
  );

  const handleStartDevbox = useCallback(
    async (devbox: DevboxListItemTypeV2 | DevboxDetailTypeV2) => {
      try {
        if (isOutStandingPayment) {
          toast.error(t('start_outstanding_tips'));
          return;
        }
        await startDevbox({ devboxName: devbox.name });
        toast.success(t('start_success'));
        track({
          event: 'deployment_start',
          module: 'devbox',
          context: 'app'
        });
      } catch (error: any) {
        toast.error(getErrorMessage(error, 'start_error'));
        console.error(error);
      }
      refetchThreeTimes();
    },
    [refetchThreeTimes, t, isOutStandingPayment, getErrorMessage]
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
        toast.error(getErrorMessage(error, 'jump_terminal_error'));
        console.error(error);
      }
    },
    [getErrorMessage]
  );

  return {
    handleRestartDevbox,
    handleStartDevbox,
    handleGoToTerminal,
    RestartConfirmChild
  };
};
