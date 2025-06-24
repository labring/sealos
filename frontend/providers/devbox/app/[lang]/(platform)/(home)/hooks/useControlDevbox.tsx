import { useCallback } from 'react';
import { useMessage } from '@sealos/ui';
import { useTranslations } from 'next-intl';
import { sealosApp } from 'sealos-desktop-sdk/app';

import { useUserStore } from '@/stores/user';
import { useGlobalStore } from '@/stores/global';
import { DevboxListItemTypeV2 } from '@/types/devbox';
import { restartDevbox, startDevbox } from '@/api/devbox';

export const useControlDevbox = (refetchDevboxList: () => void) => {
  const { setLoading } = useGlobalStore();
  const { isOutStandingPayment } = useUserStore();
  const { message: toast } = useMessage();
  const t = useTranslations();

  const handleRestartDevbox = useCallback(
    async (devbox: DevboxListItemTypeV2) => {
      try {
        setLoading(true);
        if (isOutStandingPayment) {
          toast({
            title: t('start_outstanding_tips'),
            status: 'error'
          });
          setLoading(false);
          return;
        }
        await restartDevbox({ devboxName: devbox.name });
        toast({
          title: t('restart_success'),
          status: 'success'
        });
      } catch (error: any) {
        toast({
          title: typeof error === 'string' ? error : error.message || t('restart_error'),
          status: 'error'
        });
        console.error(error);
      }
      refetchDevboxList();
      setLoading(false);
    },
    [refetchDevboxList, setLoading, t, toast, isOutStandingPayment]
  );

  const handleStartDevbox = useCallback(
    async (devbox: DevboxListItemTypeV2) => {
      try {
        setLoading(true);
        if (isOutStandingPayment) {
          toast({
            title: t('start_outstanding_tips'),
            status: 'error'
          });
          setLoading(false);
          return;
        }
        await startDevbox({ devboxName: devbox.name });
        toast({
          title: t('start_success'),
          status: 'success'
        });
      } catch (error: any) {
        toast({
          title: typeof error === 'string' ? error : error.message || t('start_error'),
          status: 'error'
        });
        console.error(error);
      }
      refetchDevboxList();
      setLoading(false);
    },
    [refetchDevboxList, setLoading, t, toast, isOutStandingPayment]
  );

  const handleGoToTerminal = useCallback(
    async (devbox: DevboxListItemTypeV2) => {
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
        toast({
          title: typeof error === 'string' ? error : error.message || t('jump_terminal_error'),
          status: 'error'
        });
        console.error(error);
      }
    },
    [t, toast]
  );

  return {
    handleRestartDevbox,
    handleStartDevbox,
    handleGoToTerminal
  };
};
