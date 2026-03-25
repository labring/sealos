import React, { useCallback, useState } from 'react';
import type { AppStatusMapType, TAppSource } from '@/types/app';
import { useRouter } from 'next/router';
import { restartAppByName, pauseAppByName, startAppByName } from '@/api/app';
import { useAppOperation } from '@/hooks/useAppOperation';
import { useConfirm } from '@/hooks/useConfirm';
import { AppStatusEnum, appStatusMap } from '@/constants/app';
import AppStatusTag from '@/components/AppStatusTag';
import dynamic from 'next/dynamic';
import { useTranslation } from 'next-i18next';
import UpdateModal from './UpdateModal';
import { Button } from '@sealos/shadcn-ui/button';
import { ButtonGroup } from '@sealos/shadcn-ui/button-group';
import { ArrowLeft, Play, Pause, PencilLine, RotateCw, Trash2 } from 'lucide-react';
import { Skeleton } from '@sealos/shadcn-ui/skeleton';

const DelModal = dynamic(() => import('./DelModal'));
const ErrorModal = dynamic(() => import('@/components/ErrorModal'));

const Header = ({
  appName = 'app-name',
  appStatus = appStatusMap[AppStatusEnum.waiting],
  isPause = false,
  refetch,
  source,
  isLoading = false
}: {
  appName?: string;
  appStatus?: AppStatusMapType;
  isPause?: boolean;
  refetch: () => void;
  source?: TAppSource;
  isLoading?: boolean;
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { executeOperation, loading, errorModalState, closeErrorModal } = useAppOperation();
  const [isOpenDelModal, setIsOpenDelModal] = useState(false);
  const [isOpenUpdateModal, setIsOpenUpdateModal] = useState(false);

  const { openConfirm: openRestartConfirm, ConfirmChild: RestartConfirmChild } = useConfirm({
    content: 'Confirm to restart this application?'
  });
  const { openConfirm: onOpenPause, ConfirmChild: PauseChild } = useConfirm({
    content: 'pause_message'
  });

  const handleRestartApp = useCallback(async () => {
    await executeOperation(() => restartAppByName(appName), {
      successMessage: t('Restart Success'),
      errorMessage: t('Restart Failed')
    });
  }, [appName, executeOperation, t]);

  const handlePauseApp = useCallback(async () => {
    await executeOperation(() => pauseAppByName(appName), {
      successMessage: t('Application paused'),
      errorMessage: t('Application failed'),
      onSuccess: () => refetch()
    });
  }, [appName, executeOperation, refetch, t]);

  const handleStartApp = useCallback(async () => {
    await executeOperation(() => startAppByName(appName), {
      successMessage: t('Start Successful'),
      errorMessage: t('Start Failed'),
      onSuccess: () => refetch()
    });
  }, [appName, executeOperation, refetch, t]);

  if (isLoading) {
    return (
      <div className="fixed top-0 left-0 right-0 z-10 flex h-20 w-full items-center px-6 justify-between bg-zinc-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 pl-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-40" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>

        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-10 w-[88px] rounded-lg" />
          <Skeleton className="h-10 w-[88px] rounded-lg" />
          <Skeleton className="h-10 w-[88px] rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-10 flex h-20 w-full items-center px-6 justify-between bg-zinc-50">
      <div className="flex items-center gap-3">
        <div
          className="flex cursor-pointer items-center gap-2 pl-2"
          onClick={() => router.replace('/apps')}
        >
          <ArrowLeft className="h-6 w-6" />
          <span className="text-xl font-semibold text-zinc-900">{appName}</span>
        </div>
        <div className="">
          <AppStatusTag status={appStatus} isPause={isPause} showBorder={false} />
        </div>
      </div>

      {/* btns */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          className="h-10 w-10 rounded-lg hover:bg-zinc-50 hover:text-[#FF324A] text-neutral-500"
          disabled={loading}
          onClick={() => setIsOpenDelModal(true)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>

        {isPause ? (
          <Button
            variant="outline"
            className="h-10 min-w-[88px] rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 flex items-center"
            disabled={loading}
            onClick={handleStartApp}
          >
            {t('Continue')}
          </Button>
        ) : (
          <ButtonGroup className="">
            <Button
              variant="outline"
              className="h-10 min-w-[88px] hover:bg-zinc-50 flex items-center rounded-lg rounded-r-none"
              disabled={loading}
              onClick={onOpenPause(handlePauseApp)}
            >
              {t('Pause')}
            </Button>
            <Button
              className="h-10 min-w-[88px] hover:bg-zinc-50 flex items-center"
              variant="outline"
              disabled={loading}
              onClick={() => {
                if (source?.hasSource && source?.sourceType === 'sealaf') {
                  setIsOpenUpdateModal(true);
                } else {
                  router.push(`/app/edit?name=${appName}`);
                }
              }}
            >
              {t('Update')}
            </Button>
            <Button
              variant="outline"
              className="h-10 min-w-[88px] hover:bg-zinc-50 flex items-center rounded-lg rounded-l-none"
              disabled={loading}
              onClick={openRestartConfirm(handleRestartApp)}
            >
              {t('Restart')}
            </Button>
          </ButtonGroup>
        )}
      </div>

      <RestartConfirmChild />
      <PauseChild />
      {isOpenDelModal && (
        <DelModal
          appName={appName}
          source={source}
          onClose={() => setIsOpenDelModal(false)}
          onSuccess={() => router.replace('/apps')}
        />
      )}
      <UpdateModal
        source={source}
        isOpen={isOpenUpdateModal}
        onClose={() => setIsOpenUpdateModal(false)}
      />
      {errorModalState.visible && (
        <ErrorModal
          title={errorModalState.title}
          content={errorModalState.content}
          errorCode={errorModalState.errorCode}
          onClose={closeErrorModal}
        />
      )}
    </div>
  );
};

export default React.memo(Header);
