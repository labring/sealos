import { pauseAppByName, postDeployApp, restartAppByName, startAppByName } from '@/api/app';
import AppStatusTag from '@/components/AppStatusTag';
import MyIcon from '@/components/Icon';
import { AppStatusEnum, appStatusMap } from '@/constants/app';
import { useConfirm } from '@/hooks/useConfirm';
import { useToast } from '@/hooks/useToast';
import { MOCK_APP_DETAIL } from '@/mock/apps';
import { useAppStore } from '@/store/app';
import type { AppStatusMapType } from '@/types/app';
import { json2Service } from '@/utils/deployYaml2Json';
import { Box, Button, Flex, useDisclosure } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import React, { Dispatch, useCallback, useState } from 'react';

const DelModal = dynamic(() => import('./DelModal'));

const Header = ({
  namespace,
  appName = 'app-name',
  appStatus = appStatusMap[AppStatusEnum.waiting],
  isPause = false,
  isStop = false,
  isLargeScreen = true,
  setShowSlider,
  refetch
}: {
  namespace: string;
  appName?: string;
  appStatus?: AppStatusMapType;
  isPause?: boolean;
  isStop?: boolean;
  isLargeScreen: boolean;
  setShowSlider: Dispatch<boolean>;
  refetch: () => void;
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const {
    isOpen: isOpenDelModal,
    onOpen: onOpenDelModal,
    onClose: onCloseDelModal
  } = useDisclosure();

  const { appDetail = MOCK_APP_DETAIL } = useAppStore();

  const { openConfirm: openRestartConfirm, ConfirmChild: RestartConfirmChild } = useConfirm({
    content: 'Confirm to restart this application?'
  });
  const { openConfirm: onOpenPause, ConfirmChild: PauseChild } = useConfirm({
    content: '确认要停止应用？'
  });

  const { openConfirm: onOpenPauseByDeleteService, ConfirmChild: PauseByDeleteServiceChild } =
    useConfirm({
      content: '确认要暂停应用？'
    });

  const [loading, setLoading] = useState(false);

  const handleRestartApp = useCallback(async () => {
    try {
      setLoading(true);
      await restartAppByName(namespace, appName);
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

  // 停止 启动
  const handlePauseApp = useCallback(async () => {
    try {
      setLoading(true);
      await pauseAppByName(namespace, appName, 'none');
      toast({
        title: '应用已停止',
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

  //暂停 恢复
  const handlePauseByDeleteService = useCallback(async () => {
    try {
      setLoading(true);
      const yaml = json2Service(appDetail, appName + '-launchpad-pause');
      await postDeployApp(namespace, [yaml], 'replace');
      await pauseAppByName(namespace, appName, 'true');

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
      await startAppByName(namespace, appName);
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

  const handleStartApp2 = useCallback(async () => {
    try {
      setLoading(true);
      const yaml = json2Service(appDetail, appName);
      await postDeployApp(namespace, [yaml], 'replace');
      await pauseAppByName(namespace, appName, 'recover');
      toast({
        title: '应用恢复',
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
      <Button
        width={'36px'}
        height={'36px'}
        variant={'unstyled'}
        onClick={() => router.replace(`/apps?namespace=${namespace}`)}
        lineHeight={1}
      >
        <MyIcon name="arrowLeft" />
      </Button>
      <Box ml={'4px'} mr={3} fontSize={'3xl'} fontWeight={'bold'}>
        {appName}
      </Box>

      <AppStatusTag status={appStatus} isStop={isStop} isPause={isPause} showBorder={false} />

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

      {isStop ? (
        <Button
          width={'96px'}
          variant={'outline'}
          mr={5}
          h={'40px'}
          leftIcon={<MyIcon name="pause" w={'20px'} fill={'#485264'} />}
          isLoading={loading}
          onClick={handleStartApp2}
        >
          恢复
        </Button>
      ) : (
        <Button
          width={'96px'}
          variant={'outline'}
          mr={5}
          h={'40px'}
          leftIcon={<MyIcon name="pause" w={'20px'} fill={'#485264'} />}
          isLoading={loading}
          onClick={onOpenPauseByDeleteService(handlePauseByDeleteService)}
        >
          暂停
        </Button>
      )}

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
          启动
        </Button>
      ) : (
        <Button
          width={'96px'}
          variant={'outline'}
          mr={5}
          h={'40px'}
          leftIcon={<MyIcon name="stop" w={'20px'} h={'20px'} fill={'#485264'} />}
          isLoading={loading}
          onClick={onOpenPause(handlePauseApp)}
        >
          停止
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
            router.push(`/app/edit?namespace=${namespace}&&name=${appName}`);
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
      <PauseByDeleteServiceChild />
      {isOpenDelModal && (
        <DelModal
          namespace={namespace}
          appName={appName}
          onClose={onCloseDelModal}
          onSuccess={() => router.replace(`/apps?namespace=${namespace}`)}
        />
      )}
    </Flex>
  );
};

export default React.memo(Header);
