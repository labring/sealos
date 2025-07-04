import { pauseDBByName, restartDB, startDBByName } from '@/api/db';
import { BaseTable } from '@/components/BaseTable/baseTable';
import { CustomMenu } from '@/components/BaseTable/customMenu';
import DBStatusTag from '@/components/DBStatusTag';
import MyIcon from '@/components/Icon';
import { DBStatusEnum, DBTypeList } from '@/constants/db';
import { applistDriverObj, startDriver } from '@/hooks/driver';
import { useClientSideValue } from '@/hooks/useClientSideValue';
import { useConfirm } from '@/hooks/useConfirm';
import UpdateModal from '@/pages/db/detail/components/UpdateModal';
import useEnvStore from '@/store/env';
import { useGlobalStore } from '@/store/global';
import { useGuideStore } from '@/store/guide';
import { DBListItemType } from '@/types/db';
import { printMemory } from '@/utils/tools';
import { Box, Button, Center, Flex, Image, Text, useDisclosure, useTheme } from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { track } from '@sealos/gtm';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable
} from '@tanstack/react-table';
import {
  ThemeAppearance,
  PrimaryColorsType,
  LangType,
  yowantLayoutConfig
} from '@/constants/chat2db';
import { useTranslation, i18n } from 'next-i18next';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  FormControl,
  FormLabel,
  Input,
  ModalFooter
} from '@chakra-ui/react';
import { setDBRemark } from '@/api/db';

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
  const {
    isOpen: isOpenRemarkModal,
    onOpen: onOpenRemarkModal,
    onClose: onCloseRemarkModal
  } = useDisclosure();
  const [remarkValue, setRemarkValue] = useState('');
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
          title: typeof error === 'string' ? error : error.message || t('restart_error'),
          status: 'error'
        });
        console.error(error, '==restart error==');

        track('error_occurred', {
          module: 'database',
          error_code: 'RESTART_ERROR'
        });
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

        track('error_occurred', {
          module: 'database',
          error_code: 'PAUSE_ERROR'
        });
      }
      setLoading(false);
      setTimeout(() => {
        refetchApps();
      }, 3000);
    },
    [refetchApps, setLoading, t, toast]
  );

  const handleStartApp = useCallback(
    async (db: DBListItemType) => {
      try {
        setLoading(true);
        await startDBByName({ dbName: db.name, dbType: db.dbType });

        track({
          event: 'deployment_start',
          module: 'database',
          context: 'app'
        });

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

        track('error_occurred', {
          module: 'database',
          error_code: 'START_ERROR'
        });
      }
      setLoading(false);
      refetchApps();
    },
    [refetchApps, setLoading, t, toast]
  );

  const handleManageData = useCallback(() => {
    const params = new URLSearchParams({
      theme: ThemeAppearance.Light,
      primaryColor: PrimaryColorsType.orange,
      language: (i18n?.language as LangType) || (navigator.language as LangType),
      hideAvatar: String(yowantLayoutConfig.hideAvatar)
    });
    router.push(`/db/manage?${params.toString()}`);
  }, [router, i18n?.language]);

  const columns = useMemo<Array<ColumnDef<DBListItemType>>>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: () => t('name'),
        cell: ({ row }) => (
          <Flex
            cursor={'pointer'}
            fontSize={'12px'}
            fontWeight={'bold'}
            alignItems={row.original?.remark ? 'flex-start' : 'center'}
            _hover={{
              '& .remark-button': {
                opacity: 1,
                visibility: 'visible'
              },
              '& .app-name': {
                maxWidth: '100px'
              }
            }}
            flexDirection={row.original?.remark ? 'column' : 'row'}
            gap={row.original?.remark ? '4px' : 0}
          >
            <Flex alignItems="center" width="100%">
              <Text
                className="app-name"
                color={'grayModern.900'}
                fontSize={'12px'}
                fontWeight={'bold'}
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
                title=""
                maxWidth="150px"
                transition="max-width 0.2s"
              >
                {row.original.name}
              </Text>

              {!row.original.remark && (
                <Center
                  className="remark-button"
                  gap={'4px'}
                  color={'#737373'}
                  opacity={0}
                  visibility="hidden"
                  transition="all 0.2s"
                  flexShrink={0}
                  ml={2}
                  onClick={() => {
                    setUpdateAppName(row.original.name);
                    setRemarkValue('');
                    onOpenRemarkModal();
                  }}
                >
                  <MyIcon name="edit" w="16px" />
                  <Text fontSize={'14px'} fontWeight={'400'} whiteSpace="nowrap">
                    {t('set_remarks')}
                  </Text>
                </Center>
              )}
            </Flex>
            {row.original.remark && (
              <Flex alignItems="center" width="100%">
                <Text
                  className="app-name"
                  fontSize={'12px'}
                  color={'#737373'}
                  flex={1}
                  overflow="hidden"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                  title=""
                  maxWidth="150px"
                  transition="max-width 0.2s"
                >
                  {row.original.remark}
                </Text>

                <Center
                  className="remark-button"
                  gap={'4px'}
                  color={'#737373'}
                  opacity={0}
                  visibility="hidden"
                  transition="all 0.2s"
                  flexShrink={0}
                  ml={2}
                  onClick={() => {
                    setUpdateAppName(row.original.name);
                    setRemarkValue(row.original.remark || '');
                    onOpenRemarkModal();
                  }}
                >
                  <MyIcon name="edit" w="16px" />
                  <Text fontSize={'14px'} fontWeight={'400'} whiteSpace="nowrap">
                    {t('set_remarks')}
                  </Text>
                </Center>
              </Flex>
            )}
          </Flex>
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
        cell: ({ row }) => <>{row.original.totalCpu / 1000}C</>
      },
      {
        accessorKey: 'memory',
        header: () => t('memory'),
        cell: ({ row }) => <>{printMemory(row.original.totalMemory)}</>
      },
      {
        accessorKey: 'storage',
        header: () => t('storage'),
        cell: ({ row }) => <>{row.original.totalStorage}Gi</>
      },
      {
        id: 'actions',
        header: () => t('operation'),
        cell: ({ row }) => (
          <Flex key={row.id}>
            <Button
              mr={'10px'}
              size={'sm'}
              h={'32px'}
              bg={'grayModern.150'}
              color={'grayModern.900'}
              _hover={{ color: 'brightBlue.600' }}
              leftIcon={<MyIcon name={'settings'} w={'18px'} h={'18px'} />}
              onClick={() => handleManageData()}
              isDisabled={row.original.status.value !== DBStatusEnum.Running}
            >
              {t('manage_data')}
            </Button>

            <Button
              mr={'4px'}
              height={'32px'}
              size={'sm'}
              fontSize={'base'}
              bg={'grayModern.150'}
              color={'grayModern.900'}
              _hover={{ color: 'brightBlue.600' }}
              leftIcon={<MyIcon name={'detail'} w={'16px'} />}
              onClick={() => {
                track('module_view', {
                  module: 'database',
                  view_name: 'details',
                  app_name: row.original.name
                });
                router.push(`/db/detail?name=${row.original.name}&dbType=${row.original.dbType}`);
              }}
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
                  <MyIcon name={'more'} px={3} transform="rotate(90deg)" />
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
                        onClick: () => {
                          track({
                            event: 'deployment_update',
                            module: 'database',
                            context: 'app'
                          });
                          handleStartApp(row.original);
                        }
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
                          track('module_view', {
                            module: 'database',
                            view_name: 'edit_form',
                            app_name: row.original.name
                          });

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
                        onClick: () => {
                          track({
                            event: 'deployment_update',
                            module: 'database',
                            context: 'app'
                          });
                          handleRestartApp(row.original);
                        },
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
                        onClick: onOpenPause(() => {
                          track({
                            event: 'deployment_shutdown',
                            module: 'database',
                            context: 'app',
                            type: 'normal'
                          });
                          handlePauseApp(row.original);
                        })
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

  const isClientSide = useClientSideValue(true);
  const { applistCompleted } = useGuideStore();
  useEffect(() => {
    if (!applistCompleted && isClientSide) {
      startDriver(applistDriverObj(t, () => router.push('/db/edit')));
    }
  }, [applistCompleted, t, router, isClientSide]);

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
          className="create-app-btn"
          minW={'95px'}
          h={'full'}
          variant={'solid'}
          leftIcon={<MyIcon name={'plus'} w={'18px'} h={'18px'} />}
          onClick={() => {
            track('module_view', {
              module: 'database',
              view_name: 'create_form'
            });
            router.push('/db/edit');
          }}
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
      <Modal isOpen={isOpenRemarkModal} onClose={onCloseRemarkModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t('set_remarks')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <Input
                placeholder={t('set_remarks_placeholder')}
                value={remarkValue}
                onChange={(e) => setRemarkValue(e.target.value)}
                maxLength={60}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={onCloseRemarkModal} mr={'12px'}>
              {t('Cancel')}
            </Button>
            <Button
              colorScheme="blue"
              onClick={async () => {
                try {
                  setLoading(true);
                  await setDBRemark({ dbName: updateAppName, remark: remarkValue });
                  toast({
                    title: t('remark_updated_successfully'),
                    status: 'success'
                  });
                  refetchApps();
                  onCloseRemarkModal();
                } catch (error) {
                  console.log('remark error', error);
                  toast({
                    title: t('update_remark_failed'),
                    status: 'error'
                  });
                }
                setLoading(false);
              }}
            >
              {t('confirm')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
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
