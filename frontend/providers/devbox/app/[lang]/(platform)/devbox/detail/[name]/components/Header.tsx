import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { sealosApp } from 'sealos-desktop-sdk/app';
import { Dispatch, useCallback, useMemo, useState } from 'react';

import { useRouter } from '@/i18n';
import { useUserStore } from '@/stores/user';
import { useGuideStore } from '@/stores/guide';
import { useDevboxStore } from '@/stores/devbox';
import { useGlobalStore } from '@/stores/global';
import { DevboxDetailTypeV2 } from '@/types/devbox';
import { DevboxStatusEnum } from '@/constants/devbox';
import { restartDevbox, startDevbox } from '@/api/devbox';

import MyIcon from '@/components/Icon';
import IDEButton from '@/components/IDEButton';
import { Button } from '@/components/ui/button';
import DelModal from '@/components/modals/DelModal';
import DevboxStatusTag from '@/components/StatusTag';
import ShutdownModal from '@/components/modals/ShutdownModal';

interface HeaderProps {
  refetchDevboxDetail: () => void;
  setShowSlider: Dispatch<boolean>;
  isLargeScreen: boolean;
}

const Header = ({ refetchDevboxDetail, setShowSlider, isLargeScreen = true }: HeaderProps) => {
  const router = useRouter();
  const t = useTranslations();

  const { isOutStandingPayment } = useUserStore();
  const { setLoading } = useGlobalStore();
  const { devboxDetail, setDevboxList } = useDevboxStore();

  const [onOpenShutdown, setOnOpenShutdown] = useState(false);
  const [delDevbox, setDelDevbox] = useState<DevboxDetailTypeV2 | null>(null);

  const { refetch: refetchDevboxList } = useQuery(['devboxListQuery'], setDevboxList, {
    onSettled(res) {
      if (!res) return;
    }
  });

  const handleRestartDevbox = useCallback(
    async (devbox: DevboxDetailTypeV2) => {
      try {
        setLoading(true);
        if (isOutStandingPayment) {
          toast.error(t('start_outstanding_tips'));
          setLoading(false);
          return;
        }
        await restartDevbox({ devboxName: devbox.name });
        toast.success(t('restart_success'));
      } catch (error: any) {
        toast.error(typeof error === 'string' ? error : error.message || t('restart_error'));
        console.error(error, '==');
      }
      refetchDevboxDetail();
      setLoading(false);
    },
    [setLoading, t, refetchDevboxDetail, isOutStandingPayment]
  );
  const handleStartDevbox = useCallback(
    async (devbox: DevboxDetailTypeV2) => {
      try {
        setLoading(true);
        if (isOutStandingPayment) {
          toast.error(t('start_outstanding_tips'));
          setLoading(false);
          return;
        }
        await startDevbox({ devboxName: devbox.name });
        toast.success(t('start_success'));
      } catch (error: any) {
        toast.error(typeof error === 'string' ? error : error.message || t('start_error'));
        console.error(error, '==');
      }
      refetchDevboxDetail();
      setLoading(false);
    },
    [setLoading, t, refetchDevboxDetail, isOutStandingPayment]
  );
  const handleGoToTerminal = useCallback(
    async (devbox: DevboxDetailTypeV2) => {
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
  const { guideIDE } = useGuideStore();

  if (!devboxDetail) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-5 pt-2 pl-4">
      {/* left back button and title */}
      <div className="flex items-center gap-2">
        <MyIcon
          name="arrowLeft"
          w={'24px'}
          onClick={() => router.push('/')}
          cursor={'pointer'}
          className="mt-1 ml-1"
        />
        <div className="text-2xl font-bold">{devboxDetail.name}</div>
        {/* detail button */}
        <div className="flex items-center">
          <DevboxStatusTag
            status={devboxDetail.status}
            className="h-[27px]"
            isShutdown={devboxDetail.status.value === DevboxStatusEnum.Shutdown}
          />
          {!isLargeScreen && (
            <div className="ml-4">
              <Button
                className="h-10 w-24 border bg-white text-[#485264] hover:text-[#1890FF]"
                onClick={() => setShowSlider(true)}
              >
                <MyIcon name="detail" w="16px" h="16px" className="mr-2" />
                {t('detail')}
              </Button>
            </div>
          )}
        </div>
      </div>
      {/* right main button group */}
      <div className="flex gap-5">
        <div>
          <IDEButton
            isGuide={!guideIDE}
            runtimeType={devboxDetail.iconId}
            devboxName={devboxDetail.name}
            sshPort={devboxDetail.sshPort as number}
            status={devboxDetail.status}
            isBigButton={isBigButton}
            leftButtonProps={{
              className: 'h-10 w-24 border-[1px_0_1px_1px] bg-white text-[#485264]'
            }}
            rightButtonProps={{
              className:
                'h-10 border-[1px_1px_1px_0] bg-white text-[#485264] shadow-[2px_1px_2px_0px_rgba(19,51,107,0.05),0px_0px_1px_0px_rgba(19,51,107,0.08)]'
            }}
          />
        </div>
        <Button
          className="h-10 border bg-white text-sm text-[#485264] hover:text-[#1890FF] disabled:opacity-50"
          disabled={devboxDetail.status.value !== 'Running'}
          onClick={() => handleGoToTerminal(devboxDetail)}
        >
          {isBigButton ? (
            <>
              <MyIcon name={'terminal'} w={'16px'} className="mr-2" />
              {t('terminal')}
            </>
          ) : (
            <MyIcon name={'terminal'} w={'16px'} />
          )}
        </Button>
        {devboxDetail.status.value === 'Running' && (
          <Button
            className="guide-close-button h-10 border bg-white text-sm text-[#485264] hover:text-[#1890FF]"
            onClick={() => setOnOpenShutdown(true)}
          >
            {isBigButton ? (
              <>
                <MyIcon name={'shutdown'} w={'16px'} className="mr-2" />
                {t('pause')}
              </>
            ) : (
              <MyIcon name={'shutdown'} w={'16px'} />
            )}
          </Button>
        )}
        {(devboxDetail.status.value === 'Stopped' || devboxDetail.status.value === 'Shutdown') && (
          <Button
            className="h-10 border bg-white text-sm text-[#485264] hover:text-[#1890FF]"
            onClick={() => handleStartDevbox(devboxDetail)}
          >
            {isBigButton ? (
              <>
                <MyIcon name={'start'} w={'16px'} className="mr-2" />
                {t('start')}
              </>
            ) : (
              <MyIcon name={'start'} w={'16px'} />
            )}
          </Button>
        )}
        <Button
          className="h-10 border bg-white text-sm text-[#485264] hover:text-[#1890FF]"
          onClick={() => router.push(`/devbox/create?name=${devboxDetail.name}`)}
        >
          {!isBigButton ? (
            <MyIcon name={'change'} w={'16px'} />
          ) : (
            <>
              <MyIcon name={'change'} w={'16px'} className="mr-2" />
              {t('update')}
            </>
          )}
        </Button>
        {devboxDetail.status.value !== 'Stopped' && devboxDetail.status.value !== 'Shutdown' && (
          <Button
            className="h-10 border bg-white text-sm text-[#485264] hover:text-[#1890FF]"
            onClick={() => handleRestartDevbox(devboxDetail)}
          >
            {isBigButton ? (
              <>
                <MyIcon name={'restart'} w={'16px'} className="mr-2" />
                {t('restart')}
              </>
            ) : (
              <MyIcon name={'restart'} w={'16px'} />
            )}
          </Button>
        )}
        <Button
          className="h-10 border bg-white text-sm text-[#485264] hover:text-red-600"
          onClick={() => setDelDevbox(devboxDetail)}
        >
          {isBigButton ? (
            <>
              <MyIcon name={'delete'} w={'16px'} className="mr-2" />
              {t('delete')}
            </>
          ) : (
            <MyIcon name={'delete'} w={'16px'} />
          )}
        </Button>
      </div>
      {!!delDevbox && (
        <DelModal
          devbox={delDevbox}
          onClose={() => setDelDevbox(null)}
          onSuccess={() => {
            setDelDevbox(null);
            router.push('/');
          }}
          refetchDevboxList={refetchDevboxList}
        />
      )}

      <ShutdownModal
        open={!!onOpenShutdown && !!devboxDetail}
        onSuccess={() => {
          refetchDevboxDetail();
          setOnOpenShutdown(false);
        }}
        onClose={() => {
          setOnOpenShutdown(false);
        }}
        devbox={devboxDetail || ({} as DevboxDetailTypeV2)}
      />
    </div>
  );
};

export default Header;
