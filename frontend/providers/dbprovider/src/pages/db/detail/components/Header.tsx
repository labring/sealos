import { pauseDBByName, restartDB, startDBByName, type DatabaseAlertItem } from '@/api/db';
import DBStatusTag from '@/components/DBStatusTag';
import { defaultDBDetail } from '@/constants/db';
import { useConfirm } from '@/hooks/useConfirm';
import type { DBDetailType } from '@/types/db';
import { Box, Button, Flex, Skeleton, useDisclosure } from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { track } from '@sealos/gtm';
import { i18n, useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import React, { Dispatch, useCallback, useState } from 'react';
import { sealosApp } from 'sealos-desktop-sdk/app';
import UpdateModal from './UpdateModal';
import {
  ThemeAppearance,
  PrimaryColorsType,
  LangType,
  yowantLayoutConfig,
  mapDBType
} from '@/constants/chat2db';
import { ConnectionInfo } from './AppBaseInfo';
import { generateLoginUrl } from '@/services/chat2db/user';
import { syncDatasource, syncDatasourceFirst } from '@/services/chat2db/datasource';
import { useDBStore } from '@/store/db';
import { getLangStore } from '@/utils/cookieUtils';
import { getDBSecret } from '@/api/db';
import useEnvStore from '@/store/env';
import { ArrowLeft, Trash2, Settings } from 'lucide-react';
const DelModal = dynamic(() => import('./DelModal'));

const Header = ({
  db = defaultDBDetail,
  conn,
  isLargeScreen = true,
  setShowSlider,
  alerts = {},
  isLoading = false
}: {
  db: DBDetailType;
  conn: ConnectionInfo | null;
  isLargeScreen: boolean;
  setShowSlider: Dispatch<boolean>;
  alerts: Record<string, DatabaseAlertItem>;
  isLoading?: boolean;
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { message: toast } = useMessage();
  const {
    isOpen: isOpenDelModal,
    onOpen: onOpenDelModal,
    onClose: onCloseDelModal
  } = useDisclosure();
  const {
    isOpen: isOpenUpdateModal,
    onOpen: onOpenUpdateModal,
    onClose: onCloseUpdateModal
  } = useDisclosure();
  const [updateAppName, setUpdateAppName] = useState('');

  const { openConfirm: openRestartConfirm, ConfirmChild: RestartConfirmChild } = useConfirm({
    content: t('confirm_restart')
  });
  const { openConfirm: onOpenPause, ConfirmChild: PauseChild } = useConfirm({
    content: t('pause_hint')
  });

  const [loading, setLoading] = useState(false);
  const { getDataSourceId, setDataSourceId } = useDBStore();
  const { SystemEnv } = useEnvStore();

  const handleRestartApp = useCallback(async () => {
    try {
      setLoading(true);
      await restartDB(db);
      toast({
        title: t('restart_success'),
        status: 'success'
      });
    } catch (error: any) {
      toast({
        title: typeof error === 'string' ? error : error.message || t('restart_error'),
        status: 'error'
      });
      console.error(error);

      track('error_occurred', {
        module: 'database',
        error_code: 'RESTART_ERROR'
      });
    }
    setLoading(false);
  }, [db, t, toast]);

  const handlePauseApp = useCallback(async () => {
    try {
      setLoading(true);
      await pauseDBByName(db);
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
  }, [db, t, toast]);

  const handleStartApp = useCallback(async () => {
    try {
      setLoading(true);
      await startDBByName(db);

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
  }, [db, t, toast]);

  const handleManageData = useCallback(async () => {
    try {
      const orgId = '34';
      const secretKey = SystemEnv.CHAT2DB_AES_KEY!;
      const userStr = localStorage.getItem('session');
      const userObj = userStr ? JSON.parse(userStr) : null;
      const userId = userObj?.user.id;
      const userNS = userObj?.user.nsid;
      const userKey = `${userId}/${userNS}`;

      try {
        const conn = await getDBSecret({
          dbName: db.dbName,
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
            break;
        }

        const payload = {
          alias: db.dbName,
          environmentId: 2 as 1 | 2,
          storageType: 'CLOUD' as 'LOCAL' | 'CLOUD',
          host: host,
          port: String(port),
          user: username,
          password: password,
          url: connectionUrl,
          type: mapDBType(db.dbType)
        };

        let currentDataSourceId = getDataSourceId(db.dbName);

        if (!currentDataSourceId) {
          try {
            const res = await syncDatasourceFirst(payload, userKey);
            currentDataSourceId = res?.data;
            if (currentDataSourceId) {
              setDataSourceId(db.dbName, currentDataSourceId);
            }
          } catch (err: any) {
            if (err?.data) {
              currentDataSourceId = err.data;
              if (currentDataSourceId) {
                setDataSourceId(db.dbName, currentDataSourceId);
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
          } catch (err) {
            console.error('sync datasource:', JSON.stringify(err));
          }
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
      } catch (error) {
        console.error('chat2db redirect failed:', error);
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
  }, [toast, router, getDataSourceId, setDataSourceId, t, SystemEnv]);

  return (
    <Flex h={'60px'} alignItems={'center'}>
      {isLoading ? (
        <>
          <Flex alignItems={'center'} gap="12px">
            <Skeleton boxSize="24px" borderRadius="999px" />
            <Skeleton h="24px" w="220px" borderRadius="6px" />
          </Flex>
          <Skeleton h="22px" w="120px" borderRadius="999px" ml="12px" />
        </>
      ) : (
        <>
          <Flex alignItems={'center'} cursor={'pointer'} onClick={() => router.replace('/dbs')}>
            <ArrowLeft size={24} color="#18181B" />
            <Box ml={'12px'} mr={'12px'} fontWeight={'600'} fontSize={'20px'}>
              {router.query.name || db.dbName}
            </Box>
          </Flex>
          <DBStatusTag
            status={db.status}
            conditions={db.conditions}
            alertReason={alerts[db.dbName]?.reason}
            alertDetails={alerts[db.dbName]?.details}
          />
        </>
      )}
      {/* {!isLargeScreen && (
        <Box mx={4}>
          <Button
            minW={'75px'}
            h={'32px'}
            fontSize={'12px'}
            variant={'outline'}
            leftIcon={<MyIcon name="detail" w={'16px'} />}
            onClick={() => setShowSlider(true)}
          >
            {t('details')}
          </Button>
        </Box>
      )} */}

      <Box flex={1} />

      {isLoading ? (
        <Flex height={'40px'} gap={'12px'} alignItems={'center'}>
          <Skeleton boxSize="40px" borderRadius="8px" />
          <Skeleton h="40px" w="180px" borderRadius="8px" />
        </Flex>
      ) : (
        <Flex height={'40px'} gap={'12px'} alignItems={'center'}>
          <Button
            display={'flex'}
            width={'40px'}
            height={'40px'}
            padding={'0 12px'}
            justifyContent={'center'}
            alignItems={'center'}
            gap={'8px'}
            borderRadius={'8px'}
            border={'1px solid #E4E4E7'}
            background={'#FFF'}
            boxShadow={'0 1px 2px 0 rgba(0, 0, 0, 0.05)'}
            isLoading={loading}
            isDisabled={db.status.value === 'Updating'}
            _hover={{
              color: '#71717A'
            }}
            onClick={onOpenDelModal}
          >
            <Trash2 size={16} color="#71717A" />
          </Button>
          <Flex>
            {db.status.value === 'Stopped' ? (
              <Button
                display={'flex'}
                width={'88px'}
                height={'40px'}
                padding={'8px 16px'}
                justifyContent={'center'}
                alignItems={'center'}
                gap={'8px'}
                background={'#FFF'}
                color={'#18181B'}
                fontFamily={'Geist, sans-serif'}
                fontSize={'14px'}
                fontWeight={'500'}
                lineHeight={'20px'}
                borderRadius={'8px'}
                isLoading={loading}
                _hover={{
                  color: '#FFF',
                  bg: '#000'
                }}
                onClick={handleStartApp}
              >
                {t('Continue')}
              </Button>
            ) : (
              <Button
                display={'flex'}
                width={'88px'}
                height={'40px'}
                padding={'8px 16px'}
                justifyContent={'center'}
                alignItems={'center'}
                gap={'8px'}
                borderRight={'1px solid #E4E4E7'}
                background={'#FFF'}
                color={'#18181B'}
                fontFamily={'Geist, sans-serif'}
                fontSize={'14px'}
                fontWeight={'500'}
                lineHeight={'20px'}
                borderRadius={'8px 0 0 8px'}
                isLoading={loading}
                isDisabled={db.status.value === 'Updating'}
                _hover={{
                  color: '#FFF',
                  bg: '#000'
                }}
                onClick={onOpenPause(handlePauseApp)}
              >
                {t('Pause')}
              </Button>
            )}

            {db.status.value !== 'Stopped' && (
              <>
                <Button
                  display={'flex'}
                  width={'88px'}
                  height={'40px'}
                  padding={'8px 16px'}
                  justifyContent={'center'}
                  alignItems={'center'}
                  gap={'8px'}
                  borderRight={'1px solid #E4E4E7'}
                  background={'#FFF'}
                  color={'#18181B'}
                  fontFamily={'Geist, sans-serif'}
                  fontSize={'14px'}
                  fontWeight={'500'}
                  lineHeight={'20px'}
                  borderRadius={'0'}
                  isLoading={loading}
                  isDisabled={db.status.value === 'Updating' && !db.isDiskSpaceOverflow}
                  _hover={{
                    color: '#FFF',
                    bg: '#000'
                  }}
                  onClick={() => {
                    if (db.source.hasSource && db.source.sourceType === 'sealaf') {
                      setUpdateAppName(db.dbName);
                      onOpenUpdateModal();
                    } else {
                      router.push(`/db/edit?name=${db.dbName}`);
                    }
                  }}
                >
                  {t('update')}
                </Button>

                <Button
                  display={'flex'}
                  width={'88px'}
                  height={'40px'}
                  padding={'8px 16px'}
                  justifyContent={'center'}
                  alignItems={'center'}
                  gap={'8px'}
                  background={'#FFF'}
                  color={'#18181B'}
                  fontFamily={'Geist, sans-serif'}
                  fontSize={'14px'}
                  fontWeight={'500'}
                  lineHeight={'20px'}
                  borderRadius={'0 8px 8px 0'}
                  isDisabled={db.status.value === 'Updating'}
                  onClick={openRestartConfirm(handleRestartApp)}
                  isLoading={loading}
                  _hover={{
                    color: '#FFF',
                    bg: '#000'
                  }}
                >
                  {t('Restart')}
                </Button>
              </>
            )}
          </Flex>

          {SystemEnv.MANAGED_DB_ENABLED === 'true' && (
            <Button
              display={'flex'}
              height={'40px'}
              padding={'8px 16px'}
              justifyContent={'center'}
              alignItems={'center'}
              gap={'8px'}
              borderRadius={'8px'}
              background={'#0A0A0A'}
              boxShadow={'0 1px 2px 0 rgba(0, 0, 0, 0.05)'}
              isLoading={loading}
              isDisabled={db.status.value !== 'Running'}
              onClick={handleManageData}
              leftIcon={<Settings size={16} color="#FFF" />}
              color={'#FFF'}
              fontFamily={'Geist, sans-serif'}
              fontSize={'14px'}
              fontWeight={'500'}
              lineHeight={'20px'}
            >
              {t('manage_data')}
            </Button>
          )}
        </Flex>
      )}

      {/* modal */}
      <RestartConfirmChild />
      <PauseChild />
      {isOpenDelModal && (
        <DelModal
          dbName={db.dbName}
          source={db.source}
          onClose={onCloseDelModal}
          onSuccess={() => router.replace('/dbs')}
        />
      )}

      <UpdateModal
        source={db.source}
        isOpen={isOpenUpdateModal}
        onClose={() => {
          setUpdateAppName('');
          onCloseUpdateModal();
        }}
      />
    </Flex>
  );
};

export default React.memo(Header);
