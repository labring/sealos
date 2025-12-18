import React, { useCallback } from 'react';
import { Box, Flex, Button, useDisclosure, Center } from '@chakra-ui/react';
import type { AppStatusMapType, TAppSource } from '@/types/app';
import { useRouter } from 'next/router';
import { restartAppByName, pauseAppByName, startAppByName } from '@/api/app';
import { useAppOperation } from '@/hooks/useAppOperation';
import { useConfirm } from '@/hooks/useConfirm';
import { AppStatusEnum, appStatusMap } from '@/constants/app';
import AppStatusTag from '@/components/AppStatusTag';
import MyIcon from '@/components/Icon';
import dynamic from 'next/dynamic';
import { useTranslation } from 'next-i18next';
import UpdateModal from './UpdateModal';

const DelModal = dynamic(() => import('./DelModal'));
const ErrorModal = dynamic(() => import('@/components/ErrorModal'));

const Header = ({
  appName = 'app-name',
  appStatus = appStatusMap[AppStatusEnum.waiting],
  isPause = false,
  refetch,
  source
}: {
  appName?: string;
  appStatus?: AppStatusMapType;
  isPause?: boolean;
  refetch: () => void;
  source?: TAppSource;
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { executeOperation, loading, errorModalState, closeErrorModal } = useAppOperation();
  const {
    isOpen: isOpenDelModal,
    onOpen: onOpenDelModal,
    onClose: onCloseDelModal
  } = useDisclosure();
  const {
    isOpen: isOpenUpdateModal,
    onOpen: onOpenUpdateModal,
    onClose: onCloseUpdateModal
  } = useDisclosure();

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

  return (
    <Flex h={'32px'} my={'14px'} alignItems={'center'}>
      <Center cursor={'pointer'} onClick={() => router.replace('/apps')}>
        <MyIcon name="arrowLeft" w={'24px'} />
      </Center>
      <Box ml={'4px'} mr={3} fontWeight={'bold'} color={'grayModern.900'} fontSize={'18px'}>
        {appName}
      </Box>
      <AppStatusTag status={appStatus} isPause={isPause} showBorder={false} />
      <Box flex={1} />

      {/* btns */}
      {isPause ? (
        <Button
          minW={'75px'}
          fontSize={'12px'}
          variant={'outline'}
          mr={'12px'}
          h={'32px'}
          leftIcon={<MyIcon name="continue" w={'16px'} fill={'#485264'} />}
          isLoading={loading}
          onClick={handleStartApp}
        >
          {t('Continue')}
        </Button>
      ) : (
        <Button
          minW={'75px'}
          fontSize={'12px'}
          variant={'outline'}
          mr={'12px'}
          h={'32px'}
          leftIcon={<MyIcon name="pause" w={'16px'} fill={'#485264'} />}
          isLoading={loading}
          onClick={onOpenPause(handlePauseApp)}
        >
          {t('Pause')}
        </Button>
      )}
      {!isPause && (
        <Button
          className="driver-detail-update-button"
          _focusVisible={{ boxShadow: '' }}
          mr={'12px'}
          h={'32px'}
          minW={'75px'}
          fontSize={'12px'}
          variant={'outline'}
          leftIcon={<MyIcon name={'change'} w={'16px'} fill={'#485264'} />}
          isLoading={loading}
          onClick={() => {
            if (source?.hasSource && source?.sourceType === 'sealaf') {
              onOpenUpdateModal();
            } else {
              router.push(`/app/edit?name=${appName}`);
            }
          }}
        >
          {t('Update')}
        </Button>
      )}

      {!isPause && (
        <Button
          mr={'12px'}
          h={'32px'}
          minW={'75px'}
          fontSize={'12px'}
          variant={'outline'}
          leftIcon={<MyIcon name="restart" w={'16px'} fill={'#485264'} />}
          onClick={openRestartConfirm(handleRestartApp)}
          isLoading={loading}
        >
          {t('Restart')}
        </Button>
      )}
      <Button
        h={'32px'}
        minW={'75px'}
        fontSize={'12px'}
        variant={'outline'}
        leftIcon={<MyIcon name="delete" w={'16px'} fill={'#485264'} />}
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
          appName={appName}
          source={source}
          onClose={onCloseDelModal}
          onSuccess={() => router.replace('/apps')}
        />
      )}
      <UpdateModal
        source={source}
        isOpen={isOpenUpdateModal}
        onClose={() => {
          onCloseUpdateModal();
        }}
      />
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
