import React, { useCallback, useState } from 'react';
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
import MyTable from '@/components/Table';
import dynamic from 'next/dynamic';
import MyMenu from '@/components/Menu';
import { useConfirm } from '@/hooks/useConfirm';

const DelModal = dynamic(() => import('@/pages/app/detail/components/DelModal'));

const AppList = ({
  apps = [],
  refetchApps
}: {
  apps: AppListItemType[];
  refetchApps: () => void;
}) => {
  const { setLoading } = useGlobalStore();
  const { toast } = useToast();
  const theme = useTheme();
  const router = useRouter();

  const [delAppName, setDelAppName] = useState('');
  const { openConfirm: onOpenPause, ConfirmChild: PauseChild } = useConfirm({
    content: '请注意，暂停状态下无法变更应用，并且如果您使用了存储卷，存储券仍会收费，请确认！'
  });

  const handleRestartApp = useCallback(
    async (appName: string) => {
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
        console.error(error, '==');
      }
      setLoading(false);
    },
    [setLoading, toast]
  );

  const handlePauseApp = useCallback(
    async (appName: string) => {
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
      refetchApps();
    },
    [refetchApps, setLoading, toast]
  );

  const handleStartApp = useCallback(
    async (appName: string) => {
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
      refetchApps();
    },
    [refetchApps, setLoading, toast]
  );

  const columns: {
    title: string;
    dataIndex?: keyof AppListItemType;
    key: string;
    render?: (item: AppListItemType) => JSX.Element;
  }[] = [
    {
      title: '名字',
      key: 'name',
      render: (item: AppListItemType) => {
        return (
          <Box pl={4} color={'myGray.900'} fontSize={'md'}>
            {item.name}
          </Box>
        );
      }
    },
    {
      title: '状态',
      key: 'status',
      render: (item: AppListItemType) => (
        <AppStatusTag status={item.status} isPause={item.isPause} />
      )
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime'
    },
    {
      title: 'CPU',
      key: 'cpu',
      render: (item: AppListItemType) => (
        <Box h={'35px'} w={['120px', '130px', '140px']}>
          <PodLineChart type="cpu" cpu={item.cpu} data={item.usedCpu.slice(-10)} />
        </Box>
      )
    },
    {
      title: '内存',
      key: 'storage',
      render: (item: AppListItemType) => (
        <Box h={'35px'} w={['120px', '130px', '140px']}>
          <PodLineChart type="memory" data={item.useMemory.slice(-10)} />
        </Box>
      )
    },
    {
      title: '实例数',
      key: 'activeReplicas',
      render: (item: AppListItemType) => (
        <Flex>
          <Box color={'myGray.900'}>活跃: {item.activeReplicas}</Box>
          {item.minReplicas !== item.maxReplicas && (
            <Box>
              &ensp;/&ensp;总共: {item.minReplicas}-{item.maxReplicas}
            </Box>
          )}
        </Flex>
      )
    },
    {
      title: '存储容量',
      key: 'store',
      render: (item: AppListItemType) => <>{item.storeAmount > 0 ? `${item.storeAmount}Gi` : '-'}</>
    },
    {
      title: '操作',
      key: 'control',
      render: (item: AppListItemType) => (
        <Flex>
          <Button
            mr={5}
            variant={'base'}
            leftIcon={<MyIcon name={'detail'} transform={'translateY(-1px)'} />}
            w={'68px'}
            onClick={() => router.push(`/app/detail?name=${item.name}`)}
          >
            详情
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
                          <Box ml={2}>启动</Box>
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
                          <Box ml={2}>暂停</Box>
                        </>
                      ),
                      onClick: onOpenPause(() => handlePauseApp(item.name))
                    }
                  ]),
              {
                child: (
                  <>
                    <MyIcon name={'change'} w={'14px'} />
                    <Box ml={2}>变更</Box>
                  </>
                ),
                onClick: () => router.push(`/app/edit?name=${item.name}`)
              },
              {
                child: (
                  <>
                    <MyIcon name={'restart'} />
                    <Box ml={2}>重启</Box>
                  </>
                ),
                onClick: () => handleRestartApp(item.name)
              },
              {
                child: (
                  <>
                    <MyIcon name={'delete'} w={'12px'} />
                    <Box ml={2}>删除</Box>
                  </>
                ),
                onClick: () => setDelAppName(item.name)
              }
            ]}
          />
        </Flex>
      )
    }
  ];

  return (
    <Box backgroundColor={'#F7F8FA'} p={34} minH="100vh">
      <Flex mb={5} alignItems={'flex-start'} justifyContent={'space-between'}>
        <Flex alignItems={'center'}>
          <Box
            mr={2}
            p={2}
            backgroundColor={'#FEFEFE'}
            border={theme.borders.sm}
            borderRadius={'sm'}
          >
            <MyIcon name="logo" w={'24px'} h={'24px'} />
          </Box>
          <Box fontSize={'lg'} color={'black'}>
            应用列表
          </Box>
          <Box ml={3} color={'gray.500'}>
            ( {apps.length} )
          </Box>
        </Flex>

        <Button
          flex={'0 0 155px'}
          colorScheme={'primary'}
          leftIcon={<MyIcon name={'plus'} w={'12px'} />}
          variant={'primary'}
          onClick={() => router.push('/app/edit')}
        >
          新建应用
        </Button>
      </Flex>
      <MyTable columns={columns} data={apps} />
      <PauseChild />
      {!!delAppName && (
        <DelModal appName={delAppName} onClose={() => setDelAppName('')} onSuccess={refetchApps} />
      )}
    </Box>
  );
};

export default AppList;
