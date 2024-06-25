import React, { Dispatch, useCallback, useState } from 'react';
import { Box, Flex, Button, useDisclosure, Center } from '@chakra-ui/react';
import type { AppStatusMapType } from '@/types/app';
import { useRouter } from 'next/router';
import { restartAppByName, pauseAppByName, startAppByName } from '@/api/app';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/hooks/useConfirm';
import { AppStatusEnum, appStatusMap } from '@/constants/app';
import AppStatusTag from '@/components/AppStatusTag';
import MyIcon from '@/components/Icon';
import dynamic from 'next/dynamic';
import { useTranslation } from 'next-i18next';

const DelModal = dynamic(() => import('./DelModal'));

const Header = ({
  appName = 'app-name',
  appStatus = appStatusMap[AppStatusEnum.waiting],
  isPause = false,
  isLargeScreen = true,
  setShowSlider,
  refetch,
  labels
}: {
  appName?: string;
  appStatus?: AppStatusMapType;
  isPause?: boolean;
  isLargeScreen: boolean;
  setShowSlider: Dispatch<boolean>;
  refetch: () => void;
  labels: { [key: string]: string };
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const {
    isOpen: isOpenDelModal,
    onOpen: onOpenDelModal,
    onClose: onCloseDelModal
  } = useDisclosure();
  const { openConfirm: openRestartConfirm, ConfirmChild: RestartConfirmChild } = useConfirm({
    content: 'Confirm to restart this application?'
  });
  const { openConfirm: onOpenPause, ConfirmChild: PauseChild } = useConfirm({
    content: 'pause_message'
  });

  const [loading, setLoading] = useState(false);

  const handleRestartApp = useCallback(async () => {
    try {
      setLoading(true);
      await restartAppByName(appName);
      toast({
        title: `${t('Restart Success')}`,
        status: 'success'
      });
    } catch (error: any) {
      toast({
        title: typeof error === 'string' ? error : error.message || '重启出现了意外',
        status: 'error'
      });
      console.error(error);
    }
    setLoading(false);
  }, [appName, toast]);

  const handlePauseApp = useCallback(async () => {
    try {
      setLoading(true);
      await pauseAppByName(appName);
      toast({
        title: '应用已暂停',
        status: 'success'
      });
    } catch (error: any) {
      toast({
        title: typeof error === 'string' ? error : error.message || '暂停应用出现了意外',
        status: 'error'
      });
      console.error(error);
    }
    setLoading(false);
    refetch();
  }, [appName, refetch, toast]);

  const handleStartApp = useCallback(async () => {
    try {
      setLoading(true);
      await startAppByName(appName);
      toast({
        title: '应用已启动',
        status: 'success'
      });
    } catch (error: any) {
      toast({
        title: typeof error === 'string' ? error : error.message || '启动应用出现了意外',
        status: 'error'
      });
      console.error(error);
    }
    setLoading(false);
    refetch();
  }, [appName, refetch, toast]);

  return (
    <Flex h={'86px'} alignItems={'center'}>
      <Center cursor={'pointer'} onClick={() => router.replace('/apps')}>
        <MyIcon name="arrowLeft" w={'24px'} />
      </Center>
      <Box ml={'4px'} mr={3} fontWeight={'bold'} color={'grayModern.900'} fontSize={'2xl'}>
        {appName}
      </Box>
      <AppStatusTag status={appStatus} isPause={isPause} showBorder={false} />
      {!isLargeScreen && (
        <Box mx={4}>
          <Button
            width={'96px'}
            height={'40px'}
            leftIcon={<MyIcon name="detail" w="16px" h="16px" />}
            variant={'outline'}
            onClick={() => setShowSlider(true)}
          >
            {t('Details')}
          </Button>
        </Box>
      )}
      <Box flex={1} />

      {/* btns */}
      {isPause ? (
        <Button
          width={'96px'}
          variant={'outline'}
          mr={5}
          h={'40px'}
          leftIcon={<MyIcon name="continue" w={'20px'} fill={'#485264'} />}
          isLoading={loading}
          onClick={handleStartApp}
        >
          {t('Continue')}
        </Button>
      ) : (
        <Button
          width={'96px'}
          variant={'outline'}
          mr={5}
          h={'40px'}
          leftIcon={<MyIcon name="pause" w={'20px'} fill={'#485264'} />}
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
          mr={5}
          h={'40px'}
          width={'96px'}
          variant={'outline'}
          leftIcon={<MyIcon name={'change'} w={'20px'} fill={'#485264'} />}
          isLoading={loading}
          onClick={() => {
            router.push(`/app/edit?name=${appName}`);
          }}
        >
          {t('Update')}
        </Button>
      )}

      {!isPause && (
        <Button
          mr={5}
          h={'40px'}
          width={'96px'}
          variant={'outline'}
          leftIcon={<MyIcon name="restart" w={'20px'} fill={'#485264'} />}
          onClick={openRestartConfirm(handleRestartApp)}
          isLoading={loading}
        >
          {t('Restart')}
        </Button>
      )}
      <Button
        h={'40px'}
        width={'96px'}
        variant={'outline'}
        leftIcon={<MyIcon name="delete" w={'20px'} fill={'#485264'} />}
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
          onClose={onCloseDelModal}
          onSuccess={() => router.replace('/apps')}
          labels={labels}
        />
      )}
    </Flex>
  );
};

export default React.memo(Header);
