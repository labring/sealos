import { useLoading } from '@/hooks/useLoading';
import { useDBStore } from '@/store/db';
import useEnvStore from '@/store/env';
import { useGlobalStore } from '@/store/global';
import { DBType } from '@/types/db';
import { serviceSideProps } from '@/utils/i18n';
import { Box, Button, Flex, Grid, Text, useMediaQuery, useTheme } from '@chakra-ui/react';
import { MyTooltip, useMessage } from '@sealos/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useMemo, useRef, useState } from 'react';
import AppBaseInfo from './components/AppBaseInfo';
import BackupTable, { type ComponentRef } from './components/BackupTable';
import DumpImport from './components/DumpImport';
import Header from './components/Header';
import MigrateTable from './components/Migrate/Table';
import Monitor from './components/Monitor';
import Pods from './components/Pods';
import { I18nCommonKey } from '@/types/i18next';
import ReconfigureTable from './components/Reconfigure/index';
import useDetailDriver from '@/hooks/useDetailDriver';
import ErrorLog from '@/pages/db/detail/components/ErrorLog';
import MyIcon from '@/components/Icon';
import { BackupSupportedDBTypeList } from '@/constants/db';

enum TabEnum {
  pod = 'pod',
  backup = 'backup',
  monitor = 'monitor',
  InternetMigration = 'InternetMigration',
  DumpImport = 'DumpImport',
  Reconfigure = 'reconfigure',
  ErrorLog = 'errorLog',
  Overview = 'overview'
}

const AppDetail = ({
  dbName,
  listType,
  dbType
}: {
  dbName: string;
  dbType: DBType;
  listType: `${TabEnum}`;
}) => {
  useDetailDriver();
  const BackupTableRef = useRef<ComponentRef>(null);
  const ReconfigureTableRef = useRef<ComponentRef>(null);
  const router = useRouter();
  const { t } = useTranslation();
  const { SystemEnv } = useEnvStore();

  const [isSmallScreen] = useMediaQuery('(max-width: 950px)');

  const { listNav } = useMemo(() => {
    const PublicNetMigration = ['postgresql', 'apecloud-mysql', 'mongodb'].includes(dbType);
    const MigrateSupported = ['postgresql', 'mongodb', 'apecloud-mysql'].includes(dbType);
    const BackupSupported = BackupSupportedDBTypeList.includes(dbType) && SystemEnv.BACKUP_ENABLED;

    const listNavValue = [
      {
        label: t('overview'),
        value: TabEnum.Overview,
        icon: <MyIcon name="overview" w={'16px'} h={'16px'} />
      },

      {
        label: 'monitor_list',
        value: TabEnum.monitor,
        icon: <MyIcon name="monitor" w={'16px'} h={'16px'} />
      },
      ...(PublicNetMigration
        ? [
            {
              label: 'dbconfig.parameter',
              value: TabEnum.Reconfigure,
              icon: <MyIcon name="config" w={'16px'} h={'16px'} />
            }
          ]
        : []),
      ...(BackupSupported
        ? [
            {
              label: 'backup_list',
              value: TabEnum.backup,
              icon: <MyIcon name="backup" w={'16px'} h={'16px'} />
            }
          ]
        : []),
      ...(PublicNetMigration
        ? [
            {
              label: 'online_import',
              value: TabEnum.InternetMigration,
              icon: <MyIcon name="import" w={'16px'} h={'16px'} />
            }
          ]
        : []),
      ...(PublicNetMigration && !!SystemEnv.minio_url
        ? [
            {
              label: 'import_through_file',
              value: TabEnum.DumpImport,
              icon: <MyIcon name="file" w={'16px'} h={'16px'} />
            }
          ]
        : []),
      ...(BackupSupported
        ? [
            {
              label: 'error_log.analysis',
              value: TabEnum.ErrorLog,
              icon: <MyIcon name="log" w={'16px'} h={'16px'} />
            }
          ]
        : [])
    ];

    return {
      isPublicNetMigration: PublicNetMigration,
      isMigrationSupported: MigrateSupported,
      isBackupSupported: BackupSupported,
      listNav: listNavValue
    };
  }, [SystemEnv, dbType]);

  const theme = useTheme();
  const { message: toast } = useMessage();
  const { Loading } = useLoading();
  const { screenWidth } = useGlobalStore();
  const isLargeScreen = useMemo(() => screenWidth > 1280, [screenWidth]);
  const { dbDetail, loadDBDetail, dbPods } = useDBStore();
  const [showSlider, setShowSlider] = useState(false);

  useQuery(['loadDBDetail', 'intervalLoadPods', dbName], () => loadDBDetail(dbName), {
    refetchInterval: 3000,
    onError(err) {
      router.replace('/dbs');
      toast({
        title: String(err),
        status: 'error'
      });
    }
  });

  return (
    <Flex
      flexDirection={'column'}
      height={'100vh'}
      bg={'grayModern.100'}
      px={'16px'}
      pb={'12px'}
      minW={'760px'}
      overflowX={'auto'}
    >
      <Box>
        <Header db={dbDetail} setShowSlider={setShowSlider} isLargeScreen={isLargeScreen} />
      </Box>
      <Flex position={'relative'} flex={'1 0 0'} h={0} gap={'8px'}>
        <Flex
          w={isSmallScreen ? '52px' : '132px'}
          flexShrink={0}
          flexDirection={'column'}
          gap={'8px'}
          bg={'white'}
          borderRadius={'8px'}
          p={'8px'}
          overflowY={'auto'}
        >
          {listNav.map((item) => (
            <Flex
              key={item.value}
              alignItems={'center'}
              h={'36px'}
              cursor={'pointer'}
              fontSize={'14px'}
              fontWeight={'500'}
              gap={isSmallScreen ? '0px' : '4px'}
              p={isSmallScreen ? '10px' : '8px'}
              position={'relative'}
              {...(item.value === listType
                ? {
                    color: 'grayModern.900',
                    bg: 'rgba(17, 24, 36, 0.05)',
                    borderRadius: '6px'
                  }
                : {
                    color: 'grayModern.500',
                    onClick: () =>
                      router.replace(
                        `/db/detail?name=${dbName}&dbType=${dbType}&listType=${item.value}`
                      )
                  })}
            >
              {isSmallScreen ? (
                <MyTooltip
                  label={t(item.label as I18nCommonKey)}
                  placement={'right'}
                  offset={[0, 16]}
                >
                  <Box>{item.icon}</Box>
                </MyTooltip>
              ) : (
                <Box>{item.icon}</Box>
              )}

              {!isSmallScreen && <Text lineHeight={'20px'}>{t(item.label as I18nCommonKey)}</Text>}
            </Flex>
          ))}
        </Flex>
        {listType === TabEnum.Overview ? (
          <Flex boxSize={'full'} flex={1} flexDirection={'column'}>
            <AppBaseInfo db={dbDetail} />
            <Box
              flex={'1 0 200px'}
              bg={'white'}
              borderRadius={'8px'}
              px={'20px'}
              py={'24px'}
              mt="6px"
              overflow={'auto'}
            >
              <Text fontSize={'16px'} fontWeight={500} color={'grayModern.900'} mb={'16px'}>
                {t('replicas_list')}
              </Text>
              <Pods dbName={dbName} dbType={dbDetail.dbType} />
            </Box>
          </Flex>
        ) : (
          <Box flex={1} bg={'white'} borderRadius={'8px'} px={'24px'} py={'16px'}>
            {listType === TabEnum.backup && <BackupTable ref={BackupTableRef} db={dbDetail} />}
            {listType === TabEnum.monitor && (
              <Monitor dbName={dbName} dbType={dbType} db={dbDetail} />
            )}
            {listType === TabEnum.InternetMigration && <MigrateTable dbName={dbName} />}
            {listType === TabEnum.DumpImport && <DumpImport db={dbDetail} />}
            {listType === TabEnum.Reconfigure && (
              <ReconfigureTable ref={ReconfigureTableRef} db={dbDetail} />
            )}
            {listType === TabEnum.ErrorLog && <ErrorLog ref={ReconfigureTableRef} db={dbDetail} />}
          </Box>
        )}
      </Flex>
      {/* <Flex position={'relative'} flex={'1 0 0'} h={0}>
        <Box
          h={'100%'}
          flex={'0 0 400px'}
          mr={4}
          overflowY={'auto'}
          zIndex={9}
          transition={'0.4s'}
          bg={'white'}
          border={theme.borders.base}
          borderRadius={'lg'}
          {...(isLargeScreen
            ? {}
            : {
                w: '400px',
                position: 'absolute',
                left: 0,
                boxShadow: '7px 4px 12px rgba(165, 172, 185, 0.25)',
                transform: `translateX(${showSlider ? '0' : '-800px'})`
              })}
        >
          {dbDetail ? <AppBaseInfo db={dbDetail} /> : <Loading loading={true} fixed={false} />}
        </Box>
        <Flex
          flexDirection={'column'}
          flex={'1 0 0'}
          w={0}
          h={'100%'}
          bg={'white'}
          border={theme.borders.base}
          borderRadius={'lg'}
        >
          <Flex m={'26px'} mb={'8px'} alignItems={'flex-start'} flexWrap={'wrap'}>
            {listNav.map((item) => (
              <Flex
                alignItems={'center'}
                gap={'4px'}
                key={item.value}
                mr={5}
                pb={2}
                borderBottom={'2px solid'}
                cursor={'pointer'}
                fontSize={'lg'}
                {...(item.value === listType
                  ? {
                      color: 'black',
                      borderBottomColor: 'black'
                    }
                  : {
                      color: 'grayModern.600',
                      borderBottomColor: 'transparent',
                      onClick: () =>
                        router.replace(
                          `/db/detail?name=${dbName}&dbType=${dbType}&listType=${item.value}`
                        )
                    })}
              >
                {item.icon}

                {t(item.label as I18nCommonKey)}
              </Flex>
            ))}
            <Box flex={1}></Box>
            {listType === TabEnum.pod && <Box color={'grayModern.600'}>{dbPods.length} Items</Box>}
            {listType === TabEnum.backup && !BackupTableRef.current?.backupProcessing && (
              <Flex alignItems={'center'}>
                <Button
                  ml={3}
                  height={'32px'}
                  variant={'solid'}
                  onClick={() => {
                    BackupTableRef.current?.openBackup();
                  }}
                >
                  {t('Backup')}
                </Button>
              </Flex>
            )}
            {listType === TabEnum.InternetMigration && (
              <Flex alignItems={'center'}>
                <Button
                  ml={3}
                  height={'32px'}
                  variant={'solid'}
                  onClick={() => {
                    router.push(`/db/migrate?name=${dbName}&dbType=${dbType}`);
                  }}
                >
                  {t('Migrate')}
                </Button>
              </Flex>
            )}
          </Flex>
          <Box flex={'1 0 0'} h={0}>
            {listType === TabEnum.pod && <Pods dbName={dbName} dbType={dbDetail.dbType} />}
            {listType === TabEnum.backup && <BackupTable ref={BackupTableRef} db={dbDetail} />}
            {listType === TabEnum.monitor && (
              <Monitor dbName={dbName} dbType={dbType} db={dbDetail} />
            )}
            {listType === TabEnum.InternetMigration && <MigrateTable dbName={dbName} />}
            {listType === TabEnum.DumpImport && <DumpImport db={dbDetail} />}
            {listType === TabEnum.Reconfigure && (
              <ReconfigureTable ref={ReconfigureTableRef} db={dbDetail} />
            )}
            {listType === TabEnum.ErrorLog && <ErrorLog ref={ReconfigureTableRef} db={dbDetail} />}
          </Box>
        </Flex>
      </Flex> */}
      {/* mask */}
      {!isLargeScreen && showSlider && (
        <Box
          position={'fixed'}
          top={0}
          left={0}
          right={0}
          bottom={0}
          onClick={() => setShowSlider(false)}
        />
      )}
    </Flex>
  );
};

export default AppDetail;

export async function getServerSideProps(context: any) {
  const dbName = context.query?.name || '';
  const dbType = context.query?.dbType || '';
  const listType = context.query?.listType || TabEnum.Overview;

  return {
    props: { ...(await serviceSideProps(context)), dbName, listType, dbType }
  };
}
