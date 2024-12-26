import { useLoading } from '@/hooks/useLoading';
import { useDBStore } from '@/store/db';
import useEnvStore from '@/store/env';
import { useGlobalStore } from '@/store/global';
import { DBType } from '@/types/db';
import { serviceSideProps } from '@/utils/i18n';
import { Box, Flex, Text, useMediaQuery, useTheme } from '@chakra-ui/react';
import { MyTooltip, useMessage } from '@sealos/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useMemo, useRef, useState } from 'react';
import AppBaseInfo from './components/AppBaseInfo';
import BackupTable, { type ComponentRef } from './components/BackupTable';
import Header from './components/Header';
import Monitor from './components/Monitor';
import Pods from './components/Pods';
import { I18nCommonKey } from '@/types/i18next';
import ReconfigureTable from './components/Reconfigure/index';
import useDetailDriver from '@/hooks/useDetailDriver';
import ErrorLog from '@/pages/db/detail/components/ErrorLog';
import MyIcon from '@/components/Icon';
import { BackupSupportedDBTypeList } from '@/constants/db';
import DataImport from './components/DataImport';
import OperationLog from './components/OperationLog';

enum TabEnum {
  pod = 'pod',
  backup = 'backup',
  monitor = 'monitor',
  // InternetMigration = 'InternetMigration',
  // DumpImport = 'DumpImport',
  Reconfigure = 'reconfigure',
  DataImport = 'dataImport',
  ErrorLog = 'errorLog',
  Overview = 'overview',
  OperationLog = 'operationLog'
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

  const [isSmallScreen] = useMediaQuery('(max-width: 1180px)');

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
      {
        label: 'change_log',
        value: TabEnum.OperationLog,
        icon: <MyIcon name="restore" w={'16px'} h={'16px'} />
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
              label: 'data_import',
              value: TabEnum.DataImport,
              icon: <MyIcon name="import" w={'16px'} h={'16px'} />
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
  }, [SystemEnv.BACKUP_ENABLED, dbType, t]);

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
      minW={'870px'}
      overflowX={'auto'}
    >
      <Box>
        <Header db={dbDetail} setShowSlider={setShowSlider} isLargeScreen={isLargeScreen} />
      </Box>
      <Flex position={'relative'} flex={'1 0 0'} h={0} gap={'8px'} minH={'600px'}>
        <Flex
          flex={isSmallScreen ? '0 0 52px' : '0 0 12%'}
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
              gap={isSmallScreen ? '0px' : '6px'}
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

            {listType === TabEnum.DataImport && <DataImport db={dbDetail} />}

            {listType === TabEnum.Reconfigure && (
              <ReconfigureTable ref={ReconfigureTableRef} db={dbDetail} />
            )}

            {listType === TabEnum.ErrorLog && <ErrorLog ref={ReconfigureTableRef} db={dbDetail} />}

            {listType === TabEnum.OperationLog && <OperationLog db={dbDetail} />}
          </Box>
        )}
      </Flex>

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
  const dbType = context.query?.dbType || '';
  const dbName = context.query?.name || '';
  const listType = context.query?.listType || TabEnum.Overview;

  return {
    props: { ...(await serviceSideProps(context)), dbName, listType, dbType }
  };
}
