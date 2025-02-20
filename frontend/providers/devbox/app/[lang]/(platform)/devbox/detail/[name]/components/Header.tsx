import { Box, Button, Flex } from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { useTranslations } from 'next-intl';
import { Dispatch, useCallback, useMemo, useState } from 'react';

import { pauseDevbox, restartDevbox, startDevbox } from '@/api/devbox';
import { useRouter } from '@/i18n';
import { useDevboxStore } from '@/stores/devbox';
import { useGlobalStore } from '@/stores/global';

import { DevboxDetailTypeV2 } from '@/types/devbox';

import DevboxStatusTag from '@/components/DevboxStatusTag';
import MyIcon from '@/components/Icon';
import IDEButton from '@/components/IDEButton';
import DelModal from '@/components/modals/DelModal';
import { sealosApp } from 'sealos-desktop-sdk/app';
import { useQuery } from '@tanstack/react-query';

const Header = ({
  refetchDevboxDetail,
  setShowSlider,
  isLargeScreen = true
}: {
  refetchDevboxDetail: () => void;
  setShowSlider: Dispatch<boolean>;
  isLargeScreen: boolean;
}) => {
  const router = useRouter();
  const t = useTranslations();
  const { message: toast } = useMessage();

  const { devboxDetail, setDevboxList } = useDevboxStore();
  const { screenWidth, setLoading } = useGlobalStore();

  const [delDevbox, setDelDevbox] = useState<DevboxDetailTypeV2 | null>(null);
  const isBigButton = useMemo(() => screenWidth > 1000, [screenWidth]);

  const { refetch: refetchDevboxList } = useQuery(['devboxListQuery'], setDevboxList, {
    onSettled(res) {
      if (!res) return;
    }
  });

  const handlePauseDevbox = useCallback(
    async (devbox: DevboxDetailTypeV2) => {
      try {
        setLoading(true);
        await pauseDevbox({ devboxName: devbox.name });
        toast({
          title: t('pause_success'),
          status: 'success'
        });
      } catch (error: any) {
        toast({
          title: typeof error === 'string' ? error : error.message || t('pause_error'),
          status: 'error'
        });
        console.error(error);
      }
      refetchDevboxDetail();
      setLoading(false);
    },
    [refetchDevboxDetail, setLoading, t, toast]
  );
  const handleRestartDevbox = useCallback(
    async (devbox: DevboxDetailTypeV2) => {
      try {
        setLoading(true);
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
        console.error(error, '==');
      }
      refetchDevboxDetail();
      setLoading(false);
    },
    [setLoading, t, toast, refetchDevboxDetail]
  );
  const handleStartDevbox = useCallback(
    async (devbox: DevboxDetailTypeV2) => {
      try {
        setLoading(true);
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
        console.error(error, '==');
      }
      refetchDevboxDetail();
      setLoading(false);
    },
    [setLoading, t, toast, refetchDevboxDetail]
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
        toast({
          title: typeof error === 'string' ? error : error.message || t('jump_terminal_error'),
          status: 'error'
        });
        console.error(error);
      }
    },
    [t, toast]
  );
  if (!devboxDetail) return null;
  return (
    <Flex justify="space-between" align="center" pl={4} pt={2} flexWrap={'wrap'} gap={5}>
      {/* left back button and title */}
      <Flex alignItems={'center'} gap={2}>
        <MyIcon
          name="arrowLeft"
          w={'24px'}
          onClick={() => router.push('/')}
          cursor={'pointer'}
          mt={1}
          ml={1}
        />
        <Box fontSize="2xl" fontWeight="bold">
          {devboxDetail.name}
        </Box>
        {/* detail button */}
        <Flex alignItems={'center'}>
          <DevboxStatusTag status={devboxDetail.status} h={'27px'} />
          {!isLargeScreen && (
            <Box ml={4}>
              <Button
                width={'96px'}
                height={'40px'}
                bg={'white'}
                borderWidth={1}
                color={'grayModern.600'}
                leftIcon={<MyIcon name="detail" w="16px" h="16px" />}
                _hover={{
                  color: 'brightBlue.600'
                }}
                onClick={() => setShowSlider(true)}
              >
                {t('detail')}
              </Button>
            </Box>
          )}
        </Flex>
      </Flex>
      {/* right main button group */}
      <Flex gap={5}>
        <Box>
          <IDEButton
            runtimeType={devboxDetail.iconId}
            devboxName={devboxDetail.name}
            sshPort={devboxDetail.sshPort as number}
            status={devboxDetail.status}
            isBigButton={isBigButton}
            leftButtonProps={{
              height: '40px',
              width: '96px',
              borderWidth: '1 0 1 1',
              bg: 'white',
              color: 'grayModern.600'
            }}
            rightButtonProps={{
              height: '40px',
              borderWidth: '1 1 1 0',
              bg: 'white',
              color: 'grayModern.600',
              mr: 0,
              boxShadow:
                '2px 1px 2px 0px rgba(19, 51, 107, 0.05),0px 0px 1px 0px rgba(19, 51, 107, 0.08)'
            }}
          />
        </Box>
        <Button
          h={'40px'}
          fontSize={'14px'}
          bg={'white'}
          color={'grayModern.600'}
          _hover={{
            color: 'brightBlue.600'
          }}
          borderWidth={1}
          leftIcon={isBigButton ? <MyIcon name={'terminal'} w={'16px'} /> : undefined}
          onClick={() => handleGoToTerminal(devboxDetail)}
        >
          {isBigButton ? t('terminal') : <MyIcon name={'terminal'} w={'16px'} />}
        </Button>
        {devboxDetail.status.value === 'Running' && (
          <Button
            className="guide-close-button"
            h={'40px'}
            fontSize={'14px'}
            bg={'white'}
            color={'grayModern.600'}
            _hover={{
              color: 'brightBlue.600'
            }}
            borderWidth={1}
            leftIcon={isBigButton ? <MyIcon name={'shutdown'} w={'16px'} /> : undefined}
            onClick={() => handlePauseDevbox(devboxDetail)}
          >
            {isBigButton ? t('pause') : <MyIcon name={'shutdown'} w={'16px'} />}
          </Button>
        )}
        {devboxDetail.status.value === 'Stopped' && (
          <Button
            h={'40px'}
            fontSize={'14px'}
            bg={'white'}
            color={'grayModern.600'}
            _hover={{
              color: 'brightBlue.600'
            }}
            borderWidth={1}
            leftIcon={isBigButton ? <MyIcon name={'start'} w={'16px'} /> : undefined}
            onClick={() => handleStartDevbox(devboxDetail)}
          >
            {isBigButton ? t('start') : <MyIcon name={'start'} w={'16px'} />}
          </Button>
        )}
        <Button
          h={'40px'}
          fontSize={'14px'}
          bg={'white'}
          color={'grayModern.600'}
          _hover={{
            color: 'brightBlue.600'
          }}
          borderWidth={1}
          leftIcon={isBigButton ? <MyIcon name={'change'} w={'16px'} /> : undefined}
          onClick={() => router.push(`/devbox/create?name=${devboxDetail.name}`)}
        >
          {!isBigButton ? <MyIcon name={'change'} w={'16px'} /> : t('update')}
        </Button>
        {devboxDetail.status.value !== 'Stopped' && (
          <Button
            h={'40px'}
            fontSize={'14px'}
            bg={'white'}
            color={'grayModern.600'}
            _hover={{
              color: 'brightBlue.600'
            }}
            borderWidth={1}
            leftIcon={isBigButton ? <MyIcon name={'restart'} w={'16px'} /> : undefined}
            onClick={() => handleRestartDevbox(devboxDetail)}
          >
            {isBigButton ? t('restart') : <MyIcon name={'restart'} w={'16px'} />}
          </Button>
        )}
        <Button
          h={'40px'}
          fontSize={'14px'}
          bg={'white'}
          color={'grayModern.600'}
          _hover={{
            color: 'red.600'
          }}
          borderWidth={1}
          leftIcon={isBigButton ? <MyIcon name={'delete'} w={'16px'} /> : undefined}
          onClick={() => setDelDevbox(devboxDetail)}
        >
          {isBigButton ? t('delete') : <MyIcon name={'delete'} w={'16px'} />}
        </Button>
      </Flex>
      {delDevbox && (
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
    </Flex>
  );
};

export default Header;
