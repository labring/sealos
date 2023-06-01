import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/router';
import { Box, Button, Flex, MenuButton } from '@chakra-ui/react';
import { DBListItemType } from '@/types/db';
import DBStatusTag from '@/components/DBStatusTag';
import MyIcon from '@/components/Icon';
import { useTheme } from '@chakra-ui/react';
import { useGlobalStore } from '@/store/global';
import { useToast } from '@/hooks/useToast';
import { restartDB, pauseDBByName, startDBByName } from '@/api/db';
import MyTable from '@/components/Table';
import dynamic from 'next/dynamic';
import MyMenu from '@/components/Menu';
import { useConfirm } from '@/hooks/useConfirm';
import { DBStatusEnum, DBComponentNameMap } from '@/constants/db';
import { printMemory } from '@/utils/tools';

const DelModal = dynamic(() => import('@/pages/db/detail/components/DelModal'));

const DBList = ({
  dbList = [],
  refetchApps
}: {
  dbList: DBListItemType[];
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
    async (db: DBListItemType) => {
      try {
        setLoading(true);
        await restartDB({ dbName: db.name, dbType: db.dbType });
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
    async (db: DBListItemType) => {
      try {
        setLoading(true);
        await pauseDBByName({ dbName: db.name, dbType: db.dbType });
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
    async (db: DBListItemType) => {
      try {
        setLoading(true);
        await startDBByName({ dbName: db.name, dbType: db.dbType });
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
    dataIndex?: keyof DBListItemType;
    key: string;
    render?: (item: DBListItemType) => JSX.Element;
  }[] = [
    {
      title: '名字',
      key: 'name',
      render: (item: DBListItemType) => {
        return (
          <Box pl={4} color={'myGray.900'} fontSize={'md'}>
            {item.name}
          </Box>
        );
      }
    },
    {
      title: '类型',
      key: 'dbType',
      render: (item: DBListItemType) => <>{DBComponentNameMap[item.dbType]}</>
    },
    {
      title: '状态',
      key: 'status',
      render: (item: DBListItemType) => (
        <DBStatusTag conditions={item.conditions} status={item.status} />
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
      render: (item: DBListItemType) => <>{item.cpu / 1000}C</>
    },
    {
      title: '内存',
      key: 'memory',
      render: (item: DBListItemType) => <>{printMemory(item.memory)}</>
    },
    {
      title: '容量',
      key: 'storage',
      dataIndex: 'storage'
    },
    {
      title: '操作',
      key: 'control',
      render: (item: DBListItemType) => (
        <Flex>
          <Button
            mr={5}
            variant={'base'}
            leftIcon={<MyIcon name={'detail'} transform={'translateY(-1px)'} />}
            w={'68px'}
            onClick={() => router.push(`/db/detail?name=${item.name}`)}
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
              ...(item.status.value === DBStatusEnum.Stopped
                ? [
                    {
                      child: (
                        <>
                          <MyIcon name={'continue'} w={'14px'} />
                          <Box ml={2}>启动</Box>
                        </>
                      ),
                      onClick: () => handleStartApp(item)
                    }
                  ]
                : [
                    {
                      child: (
                        <>
                          <MyIcon name={'change'} w={'14px'} />
                          <Box ml={2}>变更</Box>
                        </>
                      ),
                      onClick: () => router.push(`/db/edit?name=${item.name}`)
                    },
                    {
                      child: (
                        <>
                          <MyIcon name={'restart'} />
                          <Box ml={2}>重启</Box>
                        </>
                      ),
                      onClick: () => handleRestartApp(item)
                    }
                  ]),
              ...(item.status.value === DBStatusEnum.Running
                ? [
                    {
                      child: (
                        <>
                          <MyIcon name={'pause'} w={'14px'} />
                          <Box ml={2}>暂停</Box>
                        </>
                      ),
                      onClick: onOpenPause(() => handlePauseApp(item))
                    }
                  ]
                : []),

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
    <Box bg={'#F3F4F5'} px={'34px'} minH="100vh">
      <Flex h={'88px'} alignItems={'center'}>
        <Box mr={4} p={2} backgroundColor={'#FEFEFE'} border={theme.borders.sm} borderRadius={'sm'}>
          <MyIcon name="logo" w={'24px'} h={'24px'} />
        </Box>
        <Box fontSize={'2xl'} color={'black'}>
          集群列表
        </Box>
        <Box ml={3} color={'gray.500'}>
          ( {dbList.length} )
        </Box>
        <Box flex={1}></Box>

        <Button
          flex={'0 0 155px'}
          h={'40px'}
          colorScheme={'primary'}
          leftIcon={<MyIcon name={'plus'} w={'12px'} />}
          variant={'primary'}
          onClick={() => router.push('/db/edit')}
        >
          新建集群
        </Button>
      </Flex>
      <MyTable columns={columns} data={dbList} />
      <PauseChild />
      {!!delAppName && (
        <DelModal dbName={delAppName} onClose={() => setDelAppName('')} onSuccess={refetchApps} />
      )}
    </Box>
  );
};

export default DBList;
