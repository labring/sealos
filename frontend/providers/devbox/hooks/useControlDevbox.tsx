import { toast } from 'sonner';
import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { sealosApp } from 'sealos-desktop-sdk/app';

import { useUserStore } from '@/stores/user';
import { DevboxListItemTypeV2, DevboxDetailTypeV2 } from '@/types/devbox';
import { restartDevbox, startDevbox } from '@/api/devbox';
import { track } from '@sealos/gtm';
import { DevboxStatusEnum } from '@/constants/devbox';
import { useDevboxOperation } from '@/hooks/useDevboxOperation';

export const useControlDevbox = (refetchDevboxData: () => void) => {
  const { isOutStandingPayment, session } = useUserStore();
  const t = useTranslations();
  const { executeOperation, errorModalState, closeErrorModal } = useDevboxOperation();

  const refetchThreeTimes = useCallback(() => {
    refetchDevboxData();
    setTimeout(() => {
      refetchDevboxData();
      setTimeout(() => {
        refetchDevboxData();
      }, 3000);
    }, 3000);
  }, [refetchDevboxData]);

  const handleRestartDevbox = useCallback(
    async (devbox: DevboxListItemTypeV2 | DevboxDetailTypeV2) => {
      if (isOutStandingPayment) {
        toast.error(t('start_outstanding_tips'));
        return;
      }
      await executeOperation(() => restartDevbox({ devboxName: devbox.name }), {
        onSuccess: () => {
          track({
            event: 'deployment_restart',
            module: 'devbox',
            context: 'app'
          });
          refetchThreeTimes();
        },
        successMessage: t('restart_success')
      });
    },
    [refetchThreeTimes, t, isOutStandingPayment, executeOperation]
  );

  const handleStartDevbox = useCallback(
    async (devbox: DevboxListItemTypeV2 | DevboxDetailTypeV2) => {
      if (isOutStandingPayment) {
        toast.error(t('start_outstanding_tips'));
        return;
      }
      const isShutdown = devbox.status.value === DevboxStatusEnum.Shutdown;
      const shouldChangeNetwork =
        isShutdown && devbox.networkType && devbox.networkType !== 'SSHGate';

      await executeOperation(
        () =>
          startDevbox({
            devboxName: devbox.name,
            networkType: shouldChangeNetwork ? devbox.networkType : undefined
          }),
        {
          onSuccess: () => {
            track({
              event: 'deployment_start',
              module: 'devbox',
              context: 'app'
            });
            refetchThreeTimes();
          },
          successMessage: t('start_success')
        }
      );
    },
    [refetchThreeTimes, t, isOutStandingPayment, executeOperation]
  );

  const handleGoToTerminal = useCallback(
    async (devbox: DevboxListItemTypeV2 | DevboxDetailTypeV2) => {
      try {
        const ns = session?.user?.nsid;
        if (!ns) return;
        const pod = devbox.name;
        sealosApp.runEvents('openDesktopApp', {
          appKey: 'system-terminal',
          pathname: '/exec',
          query: {
            ns,
            pod
          },
          messageData: {
            type: 'InternalAppCall',
            ns,
            pod
          }
        });
        track({
          event: 'deployment_action',
          event_type: 'terminal_open',
          module: 'devbox',
          context: 'app'
        });
      } catch (error: any) {
        await executeOperation(() => Promise.reject(error), {
          successMessage: ''
        });
      }
    },
    [executeOperation, session?.user?.nsid]
  );

  return {
    handleRestartDevbox,
    handleStartDevbox,
    handleGoToTerminal,
    errorModalState,
    closeErrorModal
  };
};
