import { useLoading } from '@/hooks/useLoading';
import { useDBStore } from '@/store/db';
import useEnvStore from '@/store/env';
import { useGlobalStore } from '@/store/global';
import { DBType } from '@/types/db';
import { serviceSideProps } from '@/utils/i18n';
import { Box, Button, Flex, useTheme } from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
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

enum TabEnum {
  pod = 'pod',
  backup = 'backup',
  monitor = 'monitor',
  InternetMigration = 'InternetMigration',
  DumpImport = 'DumpImport',
  Reconfigure = 'reconfigure'
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
  const BackupTableRef = useRef<ComponentRef>(null);
  const ReconfigureTableRef = useRef<ComponentRef>(null);
  const router = useRouter();
  const { t } = useTranslation();
  const { SystemEnv } = useEnvStore();

  const { listNav } = useMemo(() => {
    const PublicNetMigration = ['postgresql', 'apecloud-mysql', 'mongodb'].includes(dbType);
    const MigrateSupported = ['postgresql', 'mongodb', 'apecloud-mysql'].includes(dbType);
    const BackupSupported =
      ['postgresql', 'mongodb', 'apecloud-mysql', 'redis'].includes(dbType) &&
      SystemEnv.BACKUP_ENABLED;

    const listNavValue = [
      { label: 'monitor_list', value: TabEnum.monitor },
      { label: 'replicas_list', value: TabEnum.pod },
      ...(PublicNetMigration ? [{ label: 'dbconfig.parameter', value: TabEnum.Reconfigure }] : []),
      ...(BackupSupported ? [{ label: 'backup_list', value: TabEnum.backup }] : []),
      ...(PublicNetMigration ? [{ label: 'online_import', value: TabEnum.InternetMigration }] : []),
      ...(PublicNetMigration && !!SystemEnv.minio_url
        ? [{ label: 'import_through_file', value: TabEnum.DumpImport }]
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

  useQuery([dbName, 'loadDBDetail', 'intervalLoadPods'], () => loadDBDetail(dbName), {
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
    <Flex flexDirection={'column'} height={'100vh'} bg={'grayModern.100'} px={9} pb={4}>
      <Box>
        <Header db={dbDetail} setShowSlider={setShowSlider} isLargeScreen={isLargeScreen} />
      </Box>
      <Flex position={'relative'} flex={'1 0 0'} h={0}>
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
          <Flex m={'26px'} mb={'8px'} alignItems={'flex-start'}>
            {listNav.map((item) => (
              <Box
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
                {t(item.label as I18nCommonKey)}
              </Box>
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
          </Box>
        </Flex>
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
  const dbName = context.query?.name || '';
  const dbType = context.query?.dbType || '';
  const listType = context.query?.listType || TabEnum.pod;

  return {
    props: { ...(await serviceSideProps(context)), dbName, listType, dbType }
  };
}
