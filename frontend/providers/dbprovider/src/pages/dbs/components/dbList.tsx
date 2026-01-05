import { pauseDBByName, restartDB, startDBByName, getDBSecret } from '@/api/db';
import { BaseTable } from '@/components/BaseTable/baseTable';
import { CustomMenu } from '@/components/BaseTable/customMenu';
import DBStatusTag from '@/components/DBStatusTag';
import type { DatabaseAlertItem } from '@/api/db';
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
import { TriangleAlert } from 'lucide-react';
import {
  Box,
  Button,
  Center,
  Flex,
  Image,
  InputLeftElement,
  InputGroup,
  Text,
  useDisclosure,
  useTheme,
  Badge
} from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { track } from '@sealos/gtm';
import {
  ColumnDef,
  FilterFn,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable
} from '@tanstack/react-table';
import {
  ThemeAppearance,
  PrimaryColorsType,
  LangType,
  yowantLayoutConfig,
  mapDBType
} from '@/constants/chat2db';
import { useTranslation, i18n } from 'next-i18next';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { generateLoginUrl } from '@/services/chat2db/user';
import { syncDatasource, syncDatasourceFirst } from '@/services/chat2db/datasource';
import { useDBStore } from '@/store/db';
import { getLangStore } from '@/utils/cookieUtils';
import { sealosApp } from 'sealos-desktop-sdk/app';

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  FormControl,
  Input,
  ModalFooter
} from '@chakra-ui/react';
import { setDBRemark } from '@/api/db';
import { useQuotaGuarded } from '@sealos/shared';

const DelModal = dynamic(() => import('@/pages/db/detail/components/DelModal'));

const DBList = ({
  dbList = [],
  refetchApps,
  alerts = {}
}: {
  dbList: DBListItemType[];
  refetchApps: () => void;
  alerts?: Record<string, DatabaseAlertItem>;
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
  const [searchQuery, setSearchQuery] = useState('');

  const { openConfirm: onOpenPause, ConfirmChild: PauseChild } = useConfirm({
    content: t('pause_hint')
  });

  useEffect(() => {
    console.log('alerts', alerts);
  }, []);

  const handleCreateApp = useQuotaGuarded(
    {
      requirements: {
        cpu: 1,
        memory: 1,
        nodeport: 1,
        storage: 1,
        traffic: true
      },
      immediate: false,
      allowContinue: true
    },
    () => {
      track('module_view', {
        module: 'database',
        view_name: 'create_form'
      });
      router.push('/db/edit');
    }
  );

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

  const { getDataSourceId, setDataSourceId } = useDBStore();

  const handleManageData = useCallback(
    async (db: DBListItemType) => {
      try {
        const orgId = '34';
        const secretKey = SystemEnv.CHAT2DB_AES_KEY!;
        const userStr = typeof window !== 'undefined' ? localStorage.getItem('session') : null;
        const userObj = userStr ? JSON.parse(userStr) : null;
        const userId = userObj?.user.id;
        const userNS = userObj?.user.nsid;
        const userKey = `${userId}/${userNS}`;

        try {
          const conn = await getDBSecret({
            dbName: db.name,
            dbType: db.dbType,
            mock: false
          });

          if (!conn) {
            return toast({
              title: 'Connection info not ready',
              status: 'error'
            });
          }

          const { host, port, connection, username, password } = conn;

          let connectionUrl = connection;
          switch (db.dbType) {
            case 'mongodb':
              connectionUrl = `mongodb://${host}:${port}`;
              break;
            case 'apecloud-mysql':
              connectionUrl = `jdbc:mysql://${host}:${port}`;
              break;
            case 'mysql':
              connectionUrl = `jdbc:mysql://${host}:${port}`;
              break;
            case 'postgresql':
              connectionUrl = `jdbc:postgresql://${host}:${port}/postgres`;
              break;
            case 'redis':
              connectionUrl = `jdbc:redis://${host}:${port}`;
              break;
            default:
              // keep original connection
              break;
          }

          const payload = {
            alias: db.name,
            environmentId: 2 as 1 | 2,
            storageType: 'CLOUD' as 'LOCAL' | 'CLOUD',
            host: host,
            port: String(port),
            user: username,
            password: password,
            url: connectionUrl,
            type: mapDBType(db.dbType)
          };

          let currentDataSourceId = getDataSourceId(db.name);
          if (!currentDataSourceId) {
            try {
              const res = await syncDatasourceFirst(payload, userKey);
              currentDataSourceId = res?.data;
              if (currentDataSourceId) {
                setDataSourceId(db.name, currentDataSourceId);
              }
            } catch (err: any) {
              if (err?.data) {
                currentDataSourceId = err.data;
                if (currentDataSourceId) {
                  setDataSourceId(db.name, currentDataSourceId);
                }
              } else {
                throw err;
              }
            }
          } else {
            try {
              const syncPayload = {
                ...payload,
                id: currentDataSourceId
              };
              await syncDatasource(syncPayload, userKey);
            } catch (err) {}
          }

          if (!currentDataSourceId) {
            throw new Error('Failed to get or create datasource ID');
          }

          const currentLang = getLangStore() || i18n?.language || 'zh';
          const chat2dbLanguage = currentLang === 'en' ? LangType.EN_US : LangType.ZH_CN;

          const baseUrl = await generateLoginUrl({
            userId,
            userNS,
            orgId,
            secretKey,
            ui: {
              theme: ThemeAppearance.Light,
              primaryColor: PrimaryColorsType.bw,
              language: chat2dbLanguage,
              hideAvatar: yowantLayoutConfig.hideAvatar
            }
          });

          const chat2dbUrl = new URL(baseUrl);
          chat2dbUrl.searchParams.set('dataSourceIds', String(currentDataSourceId));

          sealosApp.runEvents('openDesktopApp', {
            appKey: 'system-chat2db',
            pathname: '',
            query: {
              url: chat2dbUrl.toString()
            }
          });
        } catch (err) {
          console.error('chat2db redirect failed:', err);
          toast({
            title: t('chat2db_redirect_failed'),
            status: 'error'
          });
        }
      } catch (error) {
        console.error('handleManageData error:', error);
        toast({
          title: 'Failed to manage data',
          status: 'error'
        });
      }
    },
    [router, t, toast, getDataSourceId, setDataSourceId, SystemEnv]
  );

  const globalFilterFn: FilterFn<DBListItemType> = (row, columnId, filterValue) => {
    const searchTerm = filterValue.toLowerCase();
    const name = row.original.name.toLowerCase();
    const remark = (row.original.remark || '').toLowerCase();
    return name.includes(searchTerm) || remark.includes(searchTerm);
  };

  const getDBLabel = (dbType: string) => {
    if (dbType === 'apecloud-mysql' || dbType === 'mysql') {
      return 'MySQL';
    }
    return DBTypeList.find((i) => i.id === dbType)?.label || dbType;
  };

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
        enableGlobalFilter: false,
        header: () => t('Type'),
        cell: ({ row }) => (
          <Flex alignItems={'center'} gap={'6px'}>
            <Image
              width={'20px'}
              height={'20px'}
              alt={row.original.id}
              src={`/images/${row.original.dbType}.svg`}
            />
            {getDBLabel(row.original.dbType)}
          </Flex>
        )
      },
      {
        accessorKey: 'status',
        header: () => t('status'),
        cell: ({ row }) => (
          <DBStatusTag
            conditions={row.original.conditions}
            status={row.original.status}
            alertReason={alerts[row.original.name]?.reason}
            alertDetails={alerts[row.original.name]?.details}
          />
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
        cell: ({ row }) => (
          <Flex alignItems={'center'}>
            <Text>{row.original.totalStorage}Gi</Text>
            {alerts[row.original.name]?.reason === 'disk is full' && (
              <Flex
                alignItems={'center'}
                ml={'8px'}
                borderRadius={'8px'}
                px={'6px'}
                py={'4px'}
                bg={'#FEE4E2'}
              >
                <TriangleAlert size={12} color={'#991B1B'} />
                <Text ml={'4px'} color={'#991B1B'}>
                  {t('disk_is_full')}
                </Text>
              </Flex>
            )}
          </Flex>
        )
      },
      {
        id: 'actions',
        header: () => t('operation'),
        cell: ({ row }) => (
          <Flex key={row.id}>
            {SystemEnv.MANAGED_DB_ENABLED === 'true' && (
              <Button
                mr={'10px'}
                size={'sm'}
                h={'32px'}
                bg={'grayModern.150'}
                color={'grayModern.900'}
                _hover={{ color: 'brightBlue.600' }}
                leftIcon={<MyIcon name={'settings'} w={'18px'} h={'18px'} />}
                onClick={() => handleManageData(row.original)}
                isDisabled={row.original.status.value !== DBStatusEnum.Running}
              >
                {t('manage_data')}
              </Button>
            )}

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
    [
      t,
      onOpenRemarkModal,
      alerts,
      SystemEnv?.MANAGED_DB_ENABLED,
      onOpenPause,
      handleManageData,
      router,
      handleStartApp,
      onOpenUpdateModal,
      handleRestartApp,
      handlePauseApp
    ]
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
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      globalFilter: searchQuery
    },
    filterFns: {
      global: globalFilterFn
    },
    globalFilterFn: globalFilterFn
  });

  const isClientSide = useClientSideValue(true);
  const { applistCompleted, _hasHydrated } = useGuideStore();

  useEffect(() => {
    if (!applistCompleted && isClientSide && _hasHydrated) {
      startDriver(applistDriverObj(t, () => router.push('/db/edit')));
    }
  }, [applistCompleted, t, router, isClientSide, _hasHydrated]);

  const delApp = dbList.find((i) => i.name === delAppName);
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
          {table.getFilteredRowModel().rows.length}
        </Center>
        <Box flex={1}></Box>
        <InputGroup w={'200px'} h={'36px'} mr={'12px'}>
          <InputLeftElement pointerEvents="none" h="full" alignItems="center">
            <MyIcon name="search" w={'18px'} h={'18px'} />
          </InputLeftElement>
          <Input
            placeholder={t('search_name_and_remark_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            border={'1px solid'}
            borderColor={'grayModern.200'}
            h={'36px'}
            _focus={{
              borderColor: 'brightBlue.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-brightBlue-500)'
            }}
          />
        </InputGroup>
        <Button
          className="create-app-btn"
          minW={'95px'}
          h={'full'}
          variant={'solid'}
          leftIcon={<MyIcon name={'plus'} w={'18px'} h={'18px'} />}
          onClick={handleCreateApp}
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
      {!!delApp && (
        <DelModal
          source={delApp.source}
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
