import { delDBServiceByName, pauseDBByName, restartDB, startDBByName } from '@/api/db';
import DBStatusTag from '@/components/DBStatusTag';
import MyIcon from '@/components/Icon';
import { defaultDBDetail } from '@/constants/db';
import { useConfirm } from '@/hooks/useConfirm';
import type { DBDetailType, DBType } from '@/types/db';
import { Box, Button, Flex, useDisclosure, IconButton, ButtonGroup } from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { track } from '@sealos/gtm';
import { i18n, useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import React, { Dispatch, useCallback, useState } from 'react';
import UpdateModal from './UpdateModal';
import {
  ThemeAppearance,
  PrimaryColorsType,
  LangType,
  yowantLayoutConfig,
  mapDBType
} from '@/constants/chat2db';
import { ConnectionInfo } from './AppBaseInfo';
import { generateLoginUrl, syncAuthUser } from '@/services/chat2db/user';
import { syncDatasource, syncDatasourceFirst } from '@/services/chat2db/datasource';
import { dbTypeMap } from '@/utils/database';
import { error } from 'console';
import { useDBStore } from '@/store/db';
import { getLangStore } from '@/utils/cookieUtils';
const DelModal = dynamic(() => import('./DelModal'));

const Header = ({
  db = defaultDBDetail,
  conn,
  isLargeScreen = true,
  setShowSlider
}: {
  db: DBDetailType;
  conn: ConnectionInfo | null;
  isLargeScreen: boolean;
  setShowSlider: Dispatch<boolean>;
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
    const orgId = '34';
    const secretKey = process.env.NEXT_PUBLIC_CHAT2DB_AES_KEY!;
    const apiKey = process.env.NEXT_PUBLIC_CHAT2DB_API_KEY!;
    const userStr = localStorage.getItem('session');
    const userObj = userStr ? JSON.parse(userStr) : null;
    const userId = userObj?.user.id;
    const userNS = userObj?.user.nsid;
    const userKey = `${userId}/${userNS}`;

    if (!conn) {
      return toast({
        title: 'Connection info not ready',
        status: 'error'
      });
    }

    const { host, port, connection, username, password, dbType, dbName } = conn;

    let connectionUrl = connection;
    switch (dbType) {
      case 'mongodb':
        connectionUrl = `mongodb://${host}:${port}`;
        break;
      case 'apecloud-mysql':
        connectionUrl = `jdbc:mysql://${host}:${port}`;
        break;
      case 'postgresql':
        connectionUrl = `jdbc:postgresql://${host}:${port}`;
        break;
      case 'redis':
        connectionUrl = `jdbc:redis://${host}:${port}`;
        break;
      default:
        // keep original connection
        break;
    }

    const payload = {
      alias: dbName,
      environmentId: 2 as 1 | 2,
      storageType: 'CLOUD' as 'LOCAL' | 'CLOUD',
      host: host,
      port: String(port),
      user: username,
      password: password,
      url: connectionUrl,
      type: mapDBType(dbType)
    };

    console.log(JSON.stringify(payload));
    let currentDataSourceId = getDataSourceId(db.dbName);
    console.log('currentDataSourceId', currentDataSourceId);

    if (!currentDataSourceId) {
      try {
        const res = await syncDatasourceFirst(payload, apiKey, userKey);
        currentDataSourceId = res.data;
        if (currentDataSourceId) {
          setDataSourceId(db.dbName, currentDataSourceId);
          console.log('Created datasource with ID:', currentDataSourceId);
        }
      } catch (err: any) {
        if (err.data) {
          currentDataSourceId = err.data;
          if (currentDataSourceId) {
            setDataSourceId(db.dbName, currentDataSourceId);
            console.log('Datasource already exists with ID:', currentDataSourceId);
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
        await syncDatasource(syncPayload, apiKey, userKey);
        console.log('Synced existing datasource with ID:', currentDataSourceId);
      } catch (err) {
        console.log('sync datasource:', JSON.stringify(err));
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
    console.log('base url', chat2dbUrl.toString());
    router.push(chat2dbUrl.toString());
  }, [toast, router, conn, db.dbName, getDataSourceId, setDataSourceId, t]);

  return (
    <Flex h={'80px'} alignItems={'center'}>
      <Flex alignItems={'center'} cursor={'pointer'} onClick={() => router.replace('/dbs')}>
        <MyIcon name="arrowLeft" w={'24px'} h={'24px'} color={'grayModern.600'} />
        <Box ml={'4px'} mr={'12px'} fontWeight={'500'} color={'grayModern.900'} fontSize={'24px'}>
          {router.query.name || db.dbName}
        </Box>
      </Flex>
      <DBStatusTag status={db.status} conditions={db.conditions} />
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

      {/* btns */}
      {/* Migrate */}
      {/* <Button
        mr={'12px'}
        h={'36px'}
        borderColor={'myGray.200'}
        leftIcon={<MyIcon name={'change'} w={'16px'} />}
        isLoading={loading}
        variant={'base'}
        bg={'white'}
        onClick={() => {
          router.push(`/db/migrate?name=${db.dbName}&dbType=${db.dbType}`);
        }}
      >
        {t('Migrate')}
      </Button> */}
      <IconButton
        aria-label="Delete"
        className="creat-app-btn"
        variant={'solid'}
        borderRadius="md"
        mr={3}
        h={'40px'}
        w={'40px'}
        minW={'32px'}
        size="md"
        icon={<MyIcon name="delete" w="16px" h="16px" />}
        isLoading={loading}
        isDisabled={db.status.value === 'Updating'}
        onClick={onOpenDelModal}
      />

      <ButtonGroup
        isAttached
        size={'sm'}
        variant={'outline'}
        mr={3}
        h={'40px'}
        alignItems={'center'}
      >
        {db.status.value === 'Stopped' ? (
          <Button
            h={'40px'}
            w={'88px'}
            _hover={{
              bg: 'gray.200'
            }}
            isLoading={loading}
            onClick={handleStartApp}
          >
            {t('Continue')}
          </Button>
        ) : (
          <Button
            _hover={{
              bg: 'gray.200'
            }}
            h={'40px'}
            w={'88px'}
            isLoading={loading}
            isDisabled={db.status.value === 'Updating'}
            onClick={onOpenPause(handlePauseApp)}
          >
            {t('Pause')}
          </Button>
        )}

        {db.status.value !== 'Stopped' && (
          <Button
            h={'40px'}
            w={'88px'}
            _hover={{
              bg: 'gray.200'
            }}
            isLoading={loading}
            isDisabled={db.status.value === 'Updating' && !db.isDiskSpaceOverflow}
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
        )}

        {db.status.value !== 'Stopped' && (
          <Button
            h={'40px'}
            w={'88px'}
            _hover={{
              bg: 'gray.200'
            }}
            isDisabled={db.status.value === 'Updating'}
            onClick={openRestartConfirm(handleRestartApp)}
            isLoading={loading}
          >
            {t('Restart')}
          </Button>
        )}
      </ButtonGroup>

      <Button
        minW={'75px'}
        h={'40px'}
        fontSize={'12px'}
        variant={'outline'}
        bg={'black'}
        color={'white'}
        leftIcon={<MyIcon name="settings" w={'16px'} />}
        isLoading={loading}
        isDisabled={db.status.value !== 'Running'}
        onClick={handleManageData}
        alignItems={'center'}
      >
        {t('manage_data')}
      </Button>

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
