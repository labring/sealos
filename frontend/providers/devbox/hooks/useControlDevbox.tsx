import { toast } from 'sonner';
import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { sealosApp } from 'sealos-desktop-sdk/app';

import { useUserStore } from '@/stores/user';
import { DevboxListItemTypeV2, DevboxDetailTypeV2 } from '@/types/devbox';
import { restartDevbox, startDevbox } from '@/api/devbox';

export const useControlDevbox = (refetchDevboxData: () => void) => {
  const { isOutStandingPayment } = useUserStore();
  const t = useTranslations();

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
        toast.success(t('restart_success'));
      } catch (error: any) {
        toast.error(typeof error === 'string' ? error : error.message || t('restart_error'));
        console.error(error);
      }
      refetchThreeTimes();
    },
    [refetchThreeTimes, t, isOutStandingPayment]
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
      } catch (error: any) {
        toast.error(typeof error === 'string' ? error : error.message || t('start_error'));
        console.error(error);
      }
      refetchThreeTimes();
    },
    [refetchThreeTimes, t, isOutStandingPayment]
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
      } catch (error: any) {
        toast.error(typeof error === 'string' ? error : error.message || t('jump_terminal_error'));
        console.error(error);
      }
    },
    [t]
  );

  return {
    handleRestartDevbox,
    handleStartDevbox,
    handleGoToTerminal
  };
};
