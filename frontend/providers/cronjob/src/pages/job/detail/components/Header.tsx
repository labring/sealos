import { implementJob, updateCronJobStatus } from '@/api/job';
import MyIcon from '@/components/Icon';
import StatusTag from '@/components/StatusTag';
import { CronJobStatusMap } from '@/constants/job';
import { useConfirm } from '@/hooks/useConfirm';
import { useCronJobOperation } from '@/hooks/useCronJobOperation';
import type { CronJobStatusMapType } from '@/types/job';
import { Box, Button, Flex, useDisclosure } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import React, { Dispatch, useCallback } from 'react';

const DelModal = dynamic(() => import('./DelModal'));
const ErrorModal = dynamic(() => import('@/components/ErrorModal'));

const Header = ({
  appName = 'app-name',
  appStatus = CronJobStatusMap['Running'],
  isPause = false,
  isLargeScreen = true,
  setShowSlider,
  refetchCronJob,
  refetchJob
}: {
  appStatus: CronJobStatusMapType;
  appName?: string;
  isPause?: boolean;
  isLargeScreen: boolean;
  setShowSlider: Dispatch<boolean>;
  refetchCronJob: () => void;
  refetchJob: () => void;
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { executeOperation, loading, errorModalState, closeErrorModal } = useCronJobOperation();
  const {
    isOpen: isOpenDelModal,
    onOpen: onOpenDelModal,
    onClose: onCloseDelModal
  } = useDisclosure();
  const { openConfirm: openRestartConfirm, ConfirmChild: RestartConfirmChild } = useConfirm({
    content: 'Confirm to restart this application?'
  });
  const { openConfirm: onOpenPause, ConfirmChild: PauseChild } = useConfirm({
    content: t('pause_message')
  });

  const handlePauseApp = useCallback(async () => {
    await executeOperation(() => updateCronJobStatus({ jobName: appName, type: 'Stop' }), {
      successMessage: t('job_paused'),
      errorMessage: t('job_pause_error'),
      onSuccess: () => refetchCronJob()
    });
  }, [appName, executeOperation, refetchCronJob, t]);

  const handleRunJob = useCallback(async () => {
    await executeOperation(() => implementJob({ jobName: appName }), {
      successMessage: t('job_implement_success'),
      errorMessage: t('job_implement_error'),
      onSuccess: () => refetchJob()
    });
  }, [appName, executeOperation, refetchJob, t]);

  const handleStartApp = useCallback(async () => {
    await executeOperation(() => updateCronJobStatus({ jobName: appName, type: 'Start' }), {
      successMessage: t('job_started'),
      errorMessage: t('job_start_error'),
      onSuccess: () => refetchCronJob()
    });
  }, [appName, executeOperation, refetchCronJob, t]);

  return (
    <Flex h={'86px'} alignItems={'center'}>
      <Button variant={'unstyled'} onClick={() => router.replace('/jobs')} lineHeight={1}>
        <MyIcon name="arrowLeft" />
      </Button>
      <Box ml={5} mr={3} fontSize={'3xl'} fontWeight={'bold'}>
        {appName}
      </Box>
      <StatusTag status={appStatus} showBorder />
      {!isLargeScreen && (
        <Box mx={4}>
          <Button
            flex={1}
            h={'40px'}
            borderColor={'myGray.200'}
            leftIcon={<MyIcon name="detail" w={'14px'} h={'14px'} transform={'translateY(3px)'} />}
            variant={'base'}
            bg={'white'}
            onClick={() => setShowSlider(true)}
          >
            {t('Details')}
          </Button>
        </Box>
      )}
      <Box flex={1} />

      {/* btns */}
      <Button
        mr={5}
        h={'40px'}
        borderColor={'myGray.200'}
        leftIcon={<MyIcon name="continue" w={'14px'} />}
        isLoading={loading}
        variant={'base'}
        bg={'white'}
        onClick={handleRunJob}
      >
        {t('implement')}
      </Button>
      {isPause ? (
        <Button
          mr={5}
          h={'40px'}
          borderColor={'myGray.200'}
          leftIcon={<MyIcon name="continue" w={'14px'} />}
          isLoading={loading}
          variant={'base'}
          bg={'white'}
          onClick={handleStartApp}
        >
          {t('Continue')}
        </Button>
      ) : (
        <Button
          mr={5}
          h={'40px'}
          borderColor={'myGray.200'}
          leftIcon={<MyIcon name="pause" w={'14px'} />}
          isLoading={loading}
          variant={'base'}
          bg={'white'}
          onClick={onOpenPause(handlePauseApp)}
        >
          {t('Pause')}
        </Button>
      )}
      {!isPause && (
        <Button
          mr={5}
          h={'40px'}
          borderColor={'myGray.200'}
          leftIcon={<MyIcon name={'change'} w={'14px'} />}
          isLoading={loading}
          variant={'base'}
          bg={'white'}
          onClick={() => {
            router.push(`/job/edit?name=${appName}`);
          }}
        >
          {t('Update')}
        </Button>
      )}

      <Button
        h={'40px'}
        borderColor={'myGray.200'}
        leftIcon={<MyIcon name="delete" w={'14px'} h={'14px'} />}
        variant={'base'}
        bg={'white'}
        _hover={{
          color: '#FF324A'
        }}
        isDisabled={loading}
        onClick={onOpenDelModal}
      >
        {t('Delete')}
      </Button>
      <RestartConfirmChild />
      <PauseChild />
      {isOpenDelModal && (
        <DelModal
          jobName={appName}
          onClose={onCloseDelModal}
          onSuccess={() => router.replace('/jobs')}
        />
      )}
      {errorModalState.visible && (
        <ErrorModal
          title={errorModalState.title}
          content={errorModalState.content}
          errorCode={errorModalState.errorCode}
          onClose={closeErrorModal}
        />
      )}
    </Flex>
  );
};

export default React.memo(Header);
