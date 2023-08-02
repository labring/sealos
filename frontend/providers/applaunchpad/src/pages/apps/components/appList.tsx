import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Box, Button, Flex, MenuButton } from '@chakra-ui/react';
import { AppListItemType } from '@/types/app';
import PodLineChart from '@/components/PodLineChart';
import AppStatusTag from '@/components/AppStatusTag';
import MyIcon from '@/components/Icon';
import { useTheme } from '@chakra-ui/react';
import { useGlobalStore } from '@/store/global';
import { useToast } from '@/hooks/useToast';
import { restartAppByName, pauseAppByName, startAppByName } from '@/api/app';
import { useConfirm } from '@/hooks/useConfirm';
import { useTranslation } from 'next-i18next';

import dynamic from 'next/dynamic';

import MyMenu from '@/components/Menu';
import MyTable from '@/components/Table';
import GPUItem from '@/components/GPUItem';
const DelModal = dynamic(() => import('@/pages/app/detail/components/DelModal'));

const AppList = ({
  apps = [],
  refetchApps
}: {
  apps: AppListItemType[];
  refetchApps: () => void;
}) => {
  const { t } = useTranslation();
  const { setLoading, userSourcePrice } = useGlobalStore();
  const { toast } = useToast();
  const theme = useTheme();
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
          title: typeof error === 'string' ? error : error.message || t('Restart Failed'),
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
          title: typeof error === 'string' ? error : error.message || t('Application failed'),
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
          title: typeof error === 'string' ? error : error.message || t('Start Failed'),
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
            <PodLineChart type="blue" limit={item.cpu} data={item.usedCpu.slice(-10)} />
          </Box>
        )
      },
      {
        title: 'Memory',
        key: 'storage',
        render: (item: AppListItemType) => (
          <Box h={'35px'} w={['120px', '130px', '140px']}>
            <PodLineChart type="purple" limit={item.memory} data={item.useMemory.slice(-10)} />
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
              variant={'base'}
              leftIcon={<MyIcon name={'detail'} transform={'translateY(-1px)'} />}
              px={3}
              onClick={() => router.push(`/app/detail?name=${item.name}`)}
            >
              {t('Details')}
            </Button>
            <MyMenu
              width={100}
              Button={
                <MenuButton
                  w={'32px'}
                  h={'32px'}
                  borderRadius={'sm'}
                  _hover={{
                    bg: 'myWhite.400',
                    color: 'hover.iconBlue'
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
                            <MyIcon name={'continue'} w={'14px'} />
                            <Box ml={2}>{t('Start Up')}</Box>
                          </>
                        ),
                        onClick: () => handleStartApp(item.name)
                      }
                    ]
                  : [
                      {
                        child: (
                          <>
                            <MyIcon name={'pause'} w={'14px'} />
                            <Box ml={2}>{t('Pause')}</Box>
                          </>
                        ),
                        onClick: onOpenPause(() => handlePauseApp(item.name))
                      },
                      {
                        child: (
                          <>
                            <MyIcon name={'change'} w={'14px'} />
                            <Box ml={2}>{t('Update')}</Box>
                          </>
                        ),
                        onClick: () => router.push(`/app/edit?name=${item.name}`)
                      },
                      {
                        child: (
                          <>
                            <MyIcon name={'restart'} />
                            <Box ml={2}>{t('Restart')}</Box>
                          </>
                        ),
                        onClick: () => handleRestartApp(item.name)
                      }
                    ]),

                {
                  child: (
                    <>
                      <MyIcon name={'delete'} w={'12px'} />
                      <Box ml={2}>{t('Delete')}</Box>
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
    <Box backgroundColor={'#F3F4F5'} px={'34px'} pb={5} minH={'100%'}>
      <Flex h={'88px'} alignItems={'center'}>
        <Box mr={4} p={2} backgroundColor={'#FEFEFE'} border={theme.borders.sm} borderRadius={'sm'}>
          <MyIcon name="logo" w={'24px'} h={'24px'} />
        </Box>
        <Box fontSize={'2xl'} color={'black'}>
          {t('Applications')}
        </Box>
        {/* <LangSelect /> */}
        <Box ml={3} color={'gray.500'}>
          ( {apps.length} )
        </Box>
        <Box flex={1}></Box>

        <Button
          flex={'0 0 auto'}
          px={5}
          h={'40px'}
          colorScheme={'primary'}
          leftIcon={<MyIcon name={'plus'} w={'12px'} />}
          variant={'primary'}
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
