import { pauseDBByName, restartDB, startDBByName } from '@/api/db';
import { BaseTable } from '@/components/BaseTable/baseTable';
import DBStatusTag from '@/components/DBStatusTag';
import MyIcon from '@/components/Icon';
import { DBComponentNameMap, DBStatusEnum, DBTypeList } from '@/constants/db';
import { useConfirm } from '@/hooks/useConfirm';
import UpdateModal from '@/pages/db/detail/components/UpdateModal';
import useEnvStore from '@/store/env';
import { useGlobalStore } from '@/store/global';
import { DBListItemType } from '@/types/db';
import { printMemory } from '@/utils/tools';
import {
  Box,
  Button,
  Center,
  Flex,
  Image,
  MenuButton,
  useDisclosure,
  useTheme
} from '@chakra-ui/react';
import { MyTable, SealosMenu, useMessage } from '@sealos/ui';
import { getCoreRowModel, getFilteredRowModel, useReactTable } from '@tanstack/react-table';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useCallback, useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { CustomMenu } from '@/components/BaseTable/customMenu';

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
  const {
    isOpen: isOpenUpdateModal,
    onOpen: onOpenUpdateModal,
    onClose: onCloseUpdateModal
  } = useDisclosure();
  const [delAppName, setDelAppName] = useState('');
  const [updateAppName, setUpdateAppName] = useState('');

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

  const columns = useMemo<Array<ColumnDef<DBListItemType>>>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: () => t('name'),
        cell: ({ row }) => (
          <Box color={'grayModern.900'} fontSize={'md'}>
            {row.original.name}
          </Box>
        )
      },
      {
        accessorKey: 'dbType',
        header: () => t('Type'),
        cell: ({ row }) => (
          <Flex alignItems={'center'} gap={'6px'}>
            <Image
              width={'20px'}
              height={'20px'}
              alt={row.original.id}
              src={`/images/${row.original.dbType}.svg`}
            />
            {DBTypeList.find((i) => i.id === row.original.dbType)?.label}
          </Flex>
        )
      },
      {
        accessorKey: 'status',
        header: () => t('status'),
        cell: ({ row }) => (
          <DBStatusTag conditions={row.original.conditions} status={row.original.status} />
        )
      },
      {
        accessorKey: 'createTime',
        header: () => t('creation_time')
      },
      {
        accessorKey: 'cpu',
        header: () => t('cpu'),
        cell: ({ row }) => <>{row.original.cpu / 1000}C</>
      },
      {
        accessorKey: 'memory',
        header: () => t('memory'),
        cell: ({ row }) => <>{printMemory(row.original.memory)}</>
      },
      {
        accessorKey: 'storage',
        header: () => t('storage'),
        cell: ({ row }) => <>{row.original.storage}Gi</>
      },
      {
        id: 'actions',
        header: () => t('operation'),
        cell: ({ row }) => (
          <Flex key={row.id}>
            <Button
              mr={'4px'}
              height={'32px'}
              size={'sm'}
              fontSize={'base'}
              bg={'grayModern.150'}
              color={'grayModern.900'}
              _hover={{ color: 'brightBlue.600' }}
              leftIcon={<MyIcon name={'detail'} w={'16px'} />}
              onClick={() =>
                router.push(`/db/detail?name=${row.original.name}&dbType=${row.original.dbType}`)
              }
            >
              {t('details')}
            </Button>

            <CustomMenu
              width={100}
              Button={
                <Button
                  bg={'white'}
                  _hover={{
                    bg: 'rgba(17, 24, 36, 0.05)',
                    color: 'brightBlue.600'
                  }}
                  variant={'square'}
                  w={'32px'}
                  h={'32px'}
                >
                  <MyIcon name={'more'} px={3} />
                </Button>
              }
              menuList={[
                ...(row.original.status.value === DBStatusEnum.Stopped
                  ? [
                      {
                        child: (
                          <>
                            <MyIcon name={'continue'} w={'16px'} />
                            <Box ml={2}>{t('Continue')}</Box>
                          </>
                        ),
                        onClick: () => handleStartApp(row.original)
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
                        onClick: () => {
                          if (
                            row.original.source.hasSource &&
                            row.original.source.sourceType === 'sealaf'
                          ) {
                            setUpdateAppName(row.original.name);
                            onOpenUpdateModal();
                          } else {
                            router.push(`/db/edit?name=${row.original.name}`);
                          }
                        },
                        isDisabled:
                          row.original.status.value === 'Updating' &&
                          !row.original.isDiskSpaceOverflow
                      },
                      {
                        child: (
                          <>
                            <MyIcon name={'restart'} width={'16px'} />
                            <Box ml={2}>{t('Restart')}</Box>
                          </>
                        ),
                        onClick: () => handleRestartApp(row.original),
                        isDisabled: row.original.status.value === 'Updating'
                      }
                    ]),
                ...(row.original.status.value === DBStatusEnum.Running
                  ? [
                      {
                        child: (
                          <>
                            <MyIcon name={'pause'} w={'16px'} />
                            <Box ml={2}>{t('Pause')}</Box>
                          </>
                        ),
                        onClick: onOpenPause(() => handlePauseApp(row.original))
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
                  onClick: () => setDelAppName(row.original.name),
                  isDisabled: row.original.status.value === 'Updating'
                }
              ]}
            />
          </Flex>
        )
      }
    ],
    []
  );

  const table = useReactTable({
    data: dbList,
    columns,
    initialState: {
      columnPinning: {
        left: ['name'],
        right: ['actions']
      }
    },
    // enableColumnPinning: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel()
  });

  return (
    <Box
      backgroundColor={'white'}
      py={'24px'}
      px={'32px'}
      h={'full'}
      w={'full'}
      borderRadius={'xl'}
      overflowX={'hidden'}
      overflowY={'auto'}
      position={'relative'}
    >
      <Flex h={'36px'} alignItems={'center'} mb={'16px'}>
        <Box fontSize={'xl'} color={'grayModern.900'} fontWeight={'bold'}>
          {t('DBList')}
        </Box>
        <Center
          ml={'8px'}
          fontSize={'md'}
          fontWeight={'bold'}
          color={'grayModern.900'}
          bg={'grayModern.150'}
          borderRadius={'20px'}
          px={'8px'}
          py={'2px'}
          minW={'34px'}
        >
          {dbList.length}
        </Center>
        <Box flex={1}></Box>
        <Button
          minW={'95px'}
          h={'full'}
          variant={'solid'}
          leftIcon={<MyIcon name={'plus'} w={'18px'} h={'18px'} />}
          onClick={() => router.push('/db/edit')}
        >
          {t('create_db')}
        </Button>
      </Flex>

      <BaseTable
        table={table}
        isLoading={false}
        overflow={'auto'}
        tdStyle={{
          height: '64px',
          _first: {
            w: '200px'
          },
          _last: {
            w: '140px'
          }
        }}
      />

      <PauseChild />
      {!!delAppName && (
        <DelModal
          source={dbList.find((i) => i.name === delAppName)?.source}
          dbName={delAppName}
          onClose={() => setDelAppName('')}
          onSuccess={refetchApps}
        />
      )}
      <UpdateModal
        source={dbList.find((i) => i.name === updateAppName)?.source}
        isOpen={isOpenUpdateModal}
        onClose={() => {
          setUpdateAppName('');
          onCloseUpdateModal();
        }}
      />
    </Box>
  );
};

export default DBList;
