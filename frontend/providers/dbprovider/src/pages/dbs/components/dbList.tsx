import { pauseDBByName, restartDB, startDBByName } from '@/api/db';
import DBStatusTag from '@/components/DBStatusTag';
import MyIcon from '@/components/Icon';
import { DBComponentNameMap, DBStatusEnum } from '@/constants/db';
import { useConfirm } from '@/hooks/useConfirm';
import useEnvStore from '@/store/env';
import { useGlobalStore } from '@/store/global';
import { DBListItemType } from '@/types/db';
import { printMemory } from '@/utils/tools';
import { Box, Button, Center, Flex, Image, MenuButton, useTheme } from '@chakra-ui/react';
import { MyTable, SealosMenu, useMessage } from '@sealos/ui';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useCallback, useState } from 'react';

const DelModal = dynamic(() => import('@/pages/db/detail/components/DelModal'));

const DBList = ({
  dbList = [],
  refetchApps
}: {
  dbList: DBListItemType[];
  refetchApps: () => void;
}) => {
  const { t } = useTranslation();
  const { setLoading } = useGlobalStore();
  const { message: toast } = useMessage();
  const theme = useTheme();
  const router = useRouter();
  const { SystemEnv } = useEnvStore();

  const [delAppName, setDelAppName] = useState('');
  const { openConfirm: onOpenPause, ConfirmChild: PauseChild } = useConfirm({
    content: t('pause_hint')
  });

  const handleRestartApp = useCallback(
    async (db: DBListItemType) => {
      try {
        setLoading(true);
        await restartDB({ dbName: db.name, dbType: db.dbType });
        toast({
          title: t('restart_success'),
          status: 'success'
        });
      } catch (error: any) {
        toast({
          title: typeof error === 'string' ? error : error.message || t('restart_success'),
          status: 'error'
        });
        console.error(error, '==');
      }
      setLoading(false);
    },
    [setLoading, t, toast]
  );

  const handlePauseApp = useCallback(
    async (db: DBListItemType) => {
      try {
        setLoading(true);
        await pauseDBByName({ dbName: db.name, dbType: db.dbType });
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
      setLoading(false);
      refetchApps();
    },
    [refetchApps, setLoading, t, toast]
  );

  const handleStartApp = useCallback(
    async (db: DBListItemType) => {
      try {
        setLoading(true);
        await startDBByName({ dbName: db.name, dbType: db.dbType });
        toast({
          title: t('start_success'),
          status: 'success'
        });
      } catch (error: any) {
        toast({
          title: typeof error === 'string' ? error : error.message || t('start_error'),
          status: 'error'
        });
        console.error(error);
      }
      setLoading(false);
      refetchApps();
    },
    [refetchApps, setLoading, t, toast]
  );

  const columns: {
    title: string;
    dataIndex?: keyof DBListItemType;
    key: string;
    render?: (item: DBListItemType) => JSX.Element;
  }[] = [
    {
      title: t('name'),
      key: 'name',
      render: (item: DBListItemType) => {
        return (
          <Box pl={4} color={'grayModern.900'} fontSize={'md'}>
            {item.name}
          </Box>
        );
      }
    },
    {
      title: t('Type'),
      key: 'dbType',
      render: (item: DBListItemType) => (
        <Flex alignItems={'center'} gap={'6px'}>
          <Image width={'20px'} height={'20px'} alt={item.id} src={`/images/${item.dbType}.svg`} />
          {DBComponentNameMap[item.dbType]}
        </Flex>
      )
    },
    {
      title: t('status'),
      key: 'status',
      render: (item: DBListItemType) => (
        <DBStatusTag conditions={item.conditions} status={item.status} />
      )
    },
    {
      title: t('creation_time'),
      dataIndex: 'createTime',
      key: 'createTime'
    },
    {
      title: t('cpu'),
      key: 'cpu',
      render: (item: DBListItemType) => <>{item.cpu / 1000}C</>
    },
    {
      title: t('memory'),
      key: 'memory',
      render: (item: DBListItemType) => <>{printMemory(item.memory)}</>
    },
    {
      title: t('storage'),
      key: 'storage',
      dataIndex: 'storage'
    },
    {
      title: t('operation'),
      key: 'control',
      render: (item: DBListItemType) => (
        <Flex>
          <Button
            mr={5}
            height={'32px'}
            size={'sm'}
            fontSize={'base'}
            bg={'grayModern.150'}
            color={'grayModern.900'}
            _hover={{
              color: 'brightBlue.600'
            }}
            leftIcon={<MyIcon name={'detail'} w={'16px'} />}
            onClick={() => router.push(`/db/detail?name=${item.name}&dbType=${item.dbType}`)}
          >
            {t('details')}
          </Button>
          <SealosMenu
            width={100}
            Button={
              <MenuButton as={Button} variant={'square'} w={'30px'} h={'30px'}>
                <MyIcon name={'more'} px={3} />
              </MenuButton>
            }
            menuList={[
              ...(item.status.value === DBStatusEnum.Stopped
                ? [
                    {
                      child: (
                        <>
                          <MyIcon name={'continue'} w={'16px'} />
                          <Box ml={2}>{t('Continue')}</Box>
                        </>
                      ),
                      onClick: () => handleStartApp(item)
                    }
                  ]
                : [
                    {
                      child: (
                        <>
                          <MyIcon name={'change'} w={'16px'} />
                          <Box ml={2}>{t('update')}</Box>
                        </>
                      ),
                      onClick: () => router.push(`/db/edit?name=${item.name}`),
                      isDisabled: item.status.value === 'Updating' && !item.isDiskSpaceOverflow
                    },
                    {
                      child: (
                        <>
                          <MyIcon name={'restart'} width={'16px'} />
                          <Box ml={2}>{t('Restart')}</Box>
                        </>
                      ),
                      onClick: () => handleRestartApp(item),
                      isDisabled: item.status.value === 'Updating'
                    }
                  ]),
              ...(item.status.value === DBStatusEnum.Running
                ? [
                    {
                      child: (
                        <>
                          <MyIcon name={'pause'} w={'16px'} />
                          <Box ml={2}>{t('Pause')}</Box>
                        </>
                      ),
                      onClick: onOpenPause(() => handlePauseApp(item))
                    }
                  ]
                : []),

              {
                child: (
                  <>
                    <MyIcon name={'delete'} w={'16px'} />
                    <Box ml={2}>{t('Delete')}</Box>
                  </>
                ),
                menuItemStyle: {
                  _hover: {
                    color: 'red.600',
                    bg: 'rgba(17, 24, 36, 0.05)'
                  }
                },
                onClick: () => setDelAppName(item.name),
                isDisabled: item.status.value === 'Updating'
              }
            ]}
          />
        </Flex>
      )
    }
  ];

  return (
    <Box backgroundColor={'grayModern.100'} px={'32px'} minH="100vh">
      <Flex h={'90px'} alignItems={'center'}>
        <Center
          mr={'16px'}
          width={'46px'}
          bg={'#FFF'}
          height={'46px'}
          border={theme.borders.base}
          borderRadius={'md'}
        >
          <MyIcon name="logo" w={'30px'} h={'30px'} />
        </Center>
        <Box fontSize={'xl'} color={'grayModern.900'} fontWeight={'bold'}>
          {t('DBList')}
        </Box>
        <Box ml={'8px'} fontSize={'md'} fontWeight={'bold'} color={'grayModern.500'}>
          ( {dbList.length} )
        </Box>
        <Box flex={1}></Box>
        {SystemEnv?.SHOW_DOCUMENT && (
          <Button
            variant={'outline'}
            minW={'156px'}
            h={'40px'}
            mr={'16px'}
            leftIcon={<MyIcon name={'docs'} w={'16px'} />}
            onClick={() => window.open('https://sealos.run/docs/guides/dbprovider/')}
          >
            {t('use_docs')}
          </Button>
        )}
        <Button
          minW={'156px'}
          h={'40px'}
          variant={'solid'}
          leftIcon={<MyIcon name={'plus'} w={'20px'} />}
          onClick={() => router.push('/db/edit')}
        >
          {t('create_db')}
        </Button>
      </Flex>
      <MyTable columns={columns} data={dbList} />
      <PauseChild />
      {!!delAppName && (
        <DelModal
          labels={dbList?.find((item) => item.name === delAppName)?.labels || {}}
          dbName={delAppName}
          onClose={() => setDelAppName('')}
          onSuccess={refetchApps}
        />
      )}
    </Box>
  );
};

export default DBList;
