import React, { Dispatch, useCallback, useState } from 'react';
import { Box, Flex, Button, useDisclosure } from '@chakra-ui/react';
import type { AppStatusMapType } from '@/types/app';
import { useRouter } from 'next/router';
import { restartAppByName, pauseAppByName, startAppByName } from '@/api/app';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/hooks/useConfirm';
import { AppStatusEnum, appStatusMap } from '@/constants/app';
import AppStatusTag from '@/components/AppStatusTag';
import MyIcon from '@/components/Icon';
import { EditIcon } from '@chakra-ui/icons';
import dynamic from 'next/dynamic';

const DelModal = dynamic(() => import('./DelModal'));

const Header = ({
  appName = 'app-name',
  appStatus = appStatusMap[AppStatusEnum.waiting],
  isPause = false,
  isLargeScreen = true,
  setShowSlider,
  refetch
}: {
  appName?: string;
  appStatus?: AppStatusMapType;
  isPause?: boolean;
  isLargeScreen: boolean;
  setShowSlider: Dispatch<boolean>;
  refetch: () => void;
}) => {
  const router = useRouter();
  const { toast } = useToast();
  const {
    isOpen: isOpenDelModal,
    onOpen: onOpenDelModal,
    onClose: onCloseDelModal
  } = useDisclosure();
  const { openConfirm: openRestartConfirm, ConfirmChild: RestartConfirmChild } = useConfirm({
    content: '确认重启该应用?'
  });
  const { openConfirm: onOpenPause, ConfirmChild: PauseChild } = useConfirm({
    content: '请注意，暂停状态下无法变更应用，并且如果您使用了存储卷，存储券仍会收费，请确认！'
  });

  const [loading, setLoading] = useState(false);

  const handleRestartApp = useCallback(async () => {
    try {
      setLoading(true);
      await restartAppByName(appName);
      toast({
        title: '重启成功',
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
    <Flex h={'80px'} alignItems={'center'}>
      <MyIcon name="arrowLeft" cursor={'pointer'} onClick={router.back} />
      <Box ml={8} mr={3} fontSize={'xl'} fontWeight={'bold'}>
        {appName}
      </Box>
      <AppStatusTag status={appStatus} isPause={isPause} />
      {!isLargeScreen && (
        <Box mx={4}>
          <Button
            flex={1}
            leftIcon={<MyIcon name="detail" w={'14px'} h={'14px'} transform={'translateY(3px)'} />}
            variant={'base'}
            bg={'white'}
            onClick={() => setShowSlider(true)}
          >
            详情
          </Button>
        </Box>
      )}
      <Box flex={1} />

      {/* btns */}
      {isPause ? (
        <Button
          mr={5}
          leftIcon={<MyIcon name="continue" w={'14px'} />}
          isLoading={loading}
          variant={'base'}
          bg={'white'}
          onClick={handleStartApp}
        >
          继续
        </Button>
      ) : (
        <Button
          mr={5}
          leftIcon={<MyIcon name="pause" w={'14px'} />}
          isLoading={loading}
          variant={'base'}
          bg={'white'}
          onClick={onOpenPause(handlePauseApp)}
        >
          暂停
        </Button>
      )}
      {!isPause && (
        <Button
          mr={5}
          leftIcon={<MyIcon name={'change'} w={'14px'} />}
          isLoading={loading}
          variant={'base'}
          bg={'white'}
          onClick={() => {
            router.push(`/app/edit?name=${appName}`);
          }}
        >
          变更
        </Button>
      )}

      {!isPause && (
        <Button
          mr={5}
          variant={'base'}
          bg={'white'}
          leftIcon={<MyIcon name="restart" w={'14px'} h={'14px'} />}
          onClick={openRestartConfirm(handleRestartApp)}
          isLoading={loading}
        >
          重启
        </Button>
      )}
      <Button
        leftIcon={<MyIcon name="delete" w={'14px'} h={'14px'} />}
        variant={'base'}
        bg={'white'}
        _hover={{
          color: '#FF324A'
        }}
        isDisabled={loading}
        onClick={onOpenDelModal}
      >
        删除
      </Button>
      <RestartConfirmChild />
      <PauseChild />
      {isOpenDelModal && (
        <DelModal
          appName={appName}
          onClose={onCloseDelModal}
          onSuccess={() => router.replace('/apps')}
        />
      )}
    </Flex>
  );
};

export default Header;
