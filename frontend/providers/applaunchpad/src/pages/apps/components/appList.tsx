import { pauseAppByName, restartAppByName, startAppByName } from '@/api/app';
import AppStatusTag from '@/components/AppStatusTag';
import GPUItem from '@/components/GPUItem';
import MyIcon from '@/components/Icon';
import { SealosMenu } from '@sealos/ui';
import PodLineChart from '@/components/PodLineChart';
import MyTable from '@/components/Table';
import { useConfirm } from '@/hooks/useConfirm';
import { useToast } from '@/hooks/useToast';
import { useGlobalStore } from '@/store/global';
import { useUserStore } from '@/store/user';
import { AppListItemType } from '@/types/app';
import { getErrText } from '@/utils/tools';
import { Box, Button, Center, Flex, MenuButton, useTheme } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import React, { useCallback, useMemo, useState } from 'react';
import type { ThemeType } from '@sealos/ui';

const DelModal = dynamic(() => import('@/pages/app/detail/components/DelModal'));

const AppList = ({
  apps = [],
  refetchApps
}: {
  apps: AppListItemType[];
  refetchApps: () => void;
}) => {
  const { t } = useTranslation();
  const { setLoading } = useGlobalStore();
  const { userSourcePrice } = useUserStore();
  const { toast } = useToast();
  const theme = useTheme<ThemeType>();
  const router = useRouter();

  const [delAppName, setDelAppName] = useState('');
  const { openConfirm: onOpenPause, ConfirmChild: PauseChild } = useConfirm({
    content: 'pause_message'
  });

  const handleRestartApp = useCallback(
    async (appName: string) => {
      try {
        setLoading(true);
        await restartAppByName(appName);
        toast({
          title: `${t('Restart Success')}`,
          status: 'success'
        });
      } catch (error: any) {
        toast({
          title: t(getErrText(error), 'Restart Failed'),
          status: 'error'
        });
        console.error(error, '==');
      }
      setLoading(false);
    },
    [setLoading, t, toast]
  );

  const handlePauseApp = useCallback(
    async (appName: string) => {
      try {
        setLoading(true);
        await pauseAppByName(appName);
        toast({
          title: t('Application paused'),
          status: 'success'
        });
      } catch (error: any) {
        toast({
          title: t(getErrText(error), 'Pause Failed'),
          status: 'error'
        });
        console.error(error);
      }
      setLoading(false);
      refetchApps();
    },
    [refetchApps, setLoading, t, toast]
  );

  const handleStartApp = useCallback(
    async (appName: string) => {
      try {
        setLoading(true);
        await startAppByName(appName);
        toast({
          title: t('Start Successful'),
          status: 'success'
        });
      } catch (error: any) {
        toast({
          title: t(getErrText(error), 'Start Failed'),
          status: 'error'
        });
        console.error(error);
      }
      setLoading(false);
      refetchApps();
    },
    [refetchApps, setLoading, t, toast]
  );

  const columns = useMemo<
    {
      title: string;
      dataIndex?: keyof AppListItemType;
      key: string;
      render?: (item: AppListItemType) => JSX.Element;
    }[]
  >(
    () => [
      {
        title: 'Name',
        key: 'name',
        render: (item: AppListItemType) => {
          return (
            <Box pl={4} color={'myGray.900'} fontSize={'md'} fontWeight={'bold'}>
              {item.name}
            </Box>
          );
        }
      },
      {
        title: 'Status',
        key: 'status',
        render: (item: AppListItemType) => (
          <AppStatusTag status={item.status} isPause={item.isPause} showBorder={false} />
        )
      },
      {
        title: 'Creation Time',
        dataIndex: 'createTime',
        key: 'createTime'
      },
      {
        title: 'CPU',
        key: 'cpu',
        render: (item: AppListItemType) => (
          <Box h={'35px'} w={['120px', '130px', '140px']}>
            <Box h={'35px'} w={['120px', '130px', '140px']} position={'absolute'}>
              <PodLineChart type="blue" data={item.usedCpu} />
            </Box>
          </Box>
        )
      },
      {
        title: 'Memory',
        key: 'storage',
        render: (item: AppListItemType) => (
          <Box h={'35px'} w={['120px', '130px', '140px']}>
            <Box h={'35px'} w={['120px', '130px', '140px']} position={'absolute'}>
              <PodLineChart type="purple" data={item.usedMemory} />
            </Box>
          </Box>
        )
      },
      ...(userSourcePrice?.gpu
        ? [
            {
              title: 'GPU',
              key: 'gpu',
              render: (item: AppListItemType) => <GPUItem gpu={item.gpu} />
            }
          ]
        : []),
      {
        title: 'Replicas',
        key: 'activeReplicas',
        render: (item: AppListItemType) => (
          <Flex whiteSpace={'nowrap'}>
            <Box color={'myGray.900'}>
              {t('Active')}: {item.activeReplicas}
            </Box>
            {item.minReplicas !== item.maxReplicas && (
              <Box>
                &ensp;/&ensp;{t('Total')}: {item.minReplicas}-{item.maxReplicas}
              </Box>
            )}
          </Flex>
        )
      },
      {
        title: 'Storage',
        key: 'store',
        render: (item: AppListItemType) => (
          <>{item.storeAmount > 0 ? `${item.storeAmount}Gi` : '-'}</>
        )
      },
      {
        title: 'Operation',
        key: 'control',
        render: (item: AppListItemType) => (
          <Flex>
            <Button
              mr={5}
              size={'sm'}
              fontSize={'base'}
              bg={'grayModern.150'}
              color={'grayModern.900'}
              _hover={{
                color: 'brightBlue.600'
              }}
              leftIcon={<MyIcon name={'detail'} w={'16px'} h="16px" />}
              onClick={() => router.push(`/app/detail?name=${item.name}`)}
            >
              {t('Details')}
            </Button>
            <SealosMenu
              width={100}
              Button={
                <MenuButton
                  w={'30px'}
                  h={'30px'}
                  borderRadius={'sm'}
                  _hover={{
                    color: 'brightBlue.600'
                  }}
                >
                  <MyIcon name={'more'} px={3} />
                </MenuButton>
              }
              menuList={[
                ...(item.isPause
                  ? [
                      {
                        child: (
                          <>
                            <MyIcon name={'continue'} w={'16px'} />
                            <Box ml={2} fontWeight={'bold'}>
                              {t('Start Up')}
                            </Box>
                          </>
                        ),
                        onClick: () => handleStartApp(item.name)
                      }
                    ]
                  : [
                      {
                        child: (
                          <>
                            <MyIcon name={'pause'} w={'16px'} />
                            <Box ml={2} fontWeight={'bold'}>
                              {t('Pause')}
                            </Box>
                          </>
                        ),
                        onClick: onOpenPause(() => handlePauseApp(item.name))
                      },
                      {
                        child: (
                          <>
                            <MyIcon name={'change'} w={'16px'} />
                            <Box ml={2} fontWeight={'bold'}>
                              {t('Update')}
                            </Box>
                          </>
                        ),
                        onClick: () => router.push(`/app/edit?name=${item.name}`)
                      },
                      {
                        child: (
                          <>
                            <MyIcon name={'restart'} w="16px" />
                            <Box ml={2} fontWeight={'bold'}>
                              {t('Restart')}
                            </Box>
                          </>
                        ),
                        onClick: () => handleRestartApp(item.name)
                      }
                    ]),

                {
                  child: (
                    <>
                      <MyIcon name={'delete'} w={'16px'} />
                      <Box ml={2} fontWeight={'bold'}>
                        {t('Delete')}
                      </Box>
                    </>
                  ),
                  onClick: () => setDelAppName(item.name)
                }
              ]}
            />
          </Flex>
        )
      }
    ],
    [handlePauseApp, handleRestartApp, handleStartApp, onOpenPause, router, t, userSourcePrice?.gpu]
  );

  return (
    <Box backgroundColor={'grayModern.100'} px={'32px'} pb={5} minH={'100%'}>
      <Flex h={'88px'} alignItems={'center'}>
        <Center
          w="46px"
          h={'46px'}
          mr={4}
          backgroundColor={'#FEFEFE'}
          border={theme.borders[200]}
          borderRadius={'md'}
        >
          <MyIcon name="logo" w={'24px'} h={'24px'} />
        </Center>
        <Box fontSize={'xl'} color={'grayModern.900'} fontWeight={'bold'}>
          {t('Applications')}
        </Box>
        {/* <LangSelect /> */}
        <Box ml={3} color={'grayModern.500'}>
          ( {apps.length} )
        </Box>
        <Box flex={1}></Box>
        <Button
          h={'40px'}
          w={'156px'}
          flex={'0 0 auto'}
          leftIcon={<MyIcon name={'plus'} w={'20px'} fill={'#FFF'} />}
          onClick={() => router.push('/app/edit')}
        >
          {t('Create Application')}
        </Button>
      </Flex>

      <MyTable itemClass="appItem" columns={columns} data={apps} />

      <PauseChild />
      {!!delAppName && (
        <DelModal appName={delAppName} onClose={() => setDelAppName('')} onSuccess={refetchApps} />
      )}
    </Box>
  );
};

export default React.memo(AppList);
