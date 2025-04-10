import React, { Dispatch, useCallback, useState } from 'react';
import { Box, Flex, Button, useDisclosure, Center } from '@chakra-ui/react';
import type { AppStatusMapType, TAppSource } from '@/types/app';
import { useRouter } from 'next/router';
import { restartAppByName, pauseAppByName, startAppByName } from '@/api/app';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/hooks/useConfirm';
import { AppStatusEnum, appStatusMap } from '@/constants/app';
import AppStatusTag from '@/components/AppStatusTag';
import MyIcon from '@/components/Icon';
import dynamic from 'next/dynamic';
import { useTranslation } from 'next-i18next';
import UpdateModal from './UpdateModal';

const DelModal = dynamic(() => import('./DelModal'));

const Header = ({
  appName = 'app-name',
  appStatus = appStatusMap[AppStatusEnum.waiting],
  isPause = false,
  isLargeScreen = true,
  setShowSlider,
  refetch,
  source
}: {
  appName?: string;
  appStatus?: AppStatusMapType;
  isPause?: boolean;
  isLargeScreen: boolean;
  setShowSlider: Dispatch<boolean>;
  refetch: () => void;
  source?: TAppSource;
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
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
  const [updateAppName, setUpdateAppName] = useState('');

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
    <Flex h={'32px'} my={'14px'} alignItems={'center'}>
      <Center cursor={'pointer'} onClick={() => router.replace('/apps')}>
        <MyIcon name="arrowLeft" w={'24px'} />
      </Center>
      <Box ml={'4px'} mr={3} fontWeight={'bold'} color={'grayModern.900'} fontSize={'18px'}>
        {appName}
      </Box>
      <AppStatusTag status={appStatus} isPause={isPause} showBorder={false} />
      {/* {!isLargeScreen && (
        <Box mx={4}>
          <Button
            minW={'75px'}
            fontSize={'12px'}
            height={'32px'}
            leftIcon={<MyIcon name="detail" w="16px" h="16px" />}
            variant={'outline'}
            onClick={() => setShowSlider(true)}
          >
            {t('Details')}
          </Button>
        </Box>
      )} */}
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
              setUpdateAppName(appName);
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
          setUpdateAppName('');
          onCloseUpdateModal();
        }}
      />
    </Flex>
  );
};

export default React.memo(Header);
