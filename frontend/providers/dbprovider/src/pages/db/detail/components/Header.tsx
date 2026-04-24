import {
  delDBServiceByName,
  pauseDBByName,
  restartDB,
  startDBByName,
  type DatabaseAlertItem
} from '@/api/db';
import DBStatusTag from '@/components/DBStatusTag';
import MyIcon from '@/components/Icon';
import { defaultDBDetail } from '@/constants/db';
import { useConfirm } from '@/hooks/useConfirm';
import { useDBOperation } from '@/hooks/useDBOperation';
import type { DBDetailType } from '@/types/db';
import { Box, Button, Flex, Skeleton, useDisclosure } from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import React, { Dispatch, useCallback, useState, useEffect } from 'react';
import { sealosApp } from 'sealos-desktop-sdk/app';
import UpdateModal from './UpdateModal';
import { DATAFLOW_APP_KEY, DATAFLOW_SUPPORTED_TYPES } from '@/constants/dataflow';
import { ConnectionInfo } from './AppBaseInfo';
import { getLangStore } from '@/utils/cookieUtils';
import useEnvStore from '@/store/env';
import { ArrowLeft, Trash2, Settings } from 'lucide-react';
const DelModal = dynamic(() => import('./DelModal'));
const ErrorModal = dynamic(() => import('@/components/ErrorModal'));

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

  const { executeOperation, loading, errorModalState, closeErrorModal } = useDBOperation();
  const { SystemEnv } = useEnvStore();

  const handleRestartApp = useCallback(async () => {
    await executeOperation(() => restartDB(db), {
      successMessage: t('restart_success'),
      errorMessage: t('db_operation_failed'),
      eventName: 'deployment_restart'
    });
  }, [db, executeOperation, t]);

  const handlePauseApp = useCallback(async () => {
    await executeOperation(() => pauseDBByName(db), {
      successMessage: t('pause_success'),
      errorMessage: t('pause_error'),
      eventName: 'deployment_shutdown'
    });
  }, [db, executeOperation, t]);

  const handleStartApp = useCallback(async () => {
    await executeOperation(() => startDBByName(db), {
      successMessage: t('start_success'),
      errorMessage: t('start_error'),
      eventName: 'deployment_start'
    });
  }, [db, executeOperation, t]);

  const handleManageData = useCallback(async () => {
    try {
      const currentLang = getLangStore() || 'zh';

      sealosApp.runEvents('openDesktopApp', {
        appKey: DATAFLOW_APP_KEY,
        query: {
          resourceName: db.dbName,
          dbType: db.dbType,
          theme: 'light',
          lang: currentLang
        }
      });
    } catch (error) {
      console.error('handleManageData error:', error);
      toast({ title: t('manage_data_redirect_failed'), status: 'error' });
    }
  }, [toast, t, db.dbName, db.dbType]);

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

          {SystemEnv.DATAFLOW_ENABLED === 'true' && DATAFLOW_SUPPORTED_TYPES.has(db.dbType) && (
            <Button
              display={'flex'}
              height={'40px'}
              padding={'8px 16px'}
              justifyContent={'center'}
              alignItems={'center'}
              gap={'8px'}
              borderRadius={'8px'}
              border={'1px solid #E4E4E7'}
              background={'#FFF'}
              boxShadow={'0 1px 2px 0 rgba(0, 0, 0, 0.05)'}
              isLoading={loading}
              isDisabled={db.status.value !== 'Running'}
              onClick={handleManageData}
              leftIcon={<Settings size={16} color="#71717A" />}
              color={'#18181B'}
              fontFamily={'Geist, sans-serif'}
              fontSize={'14px'}
              fontWeight={'500'}
              lineHeight={'20px'}
              _hover={{
                color: '#FFF',
                bg: '#000',
                '& svg': { color: '#FFF' }
              }}
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
      {errorModalState.visible && (
        <ErrorModal
          title={errorModalState.title}
          content={errorModalState.content}
          errorCode={errorModalState.errorCode}
          onClose={closeErrorModal}
        />
      )}
    </Flex>
  );
};

export default React.memo(Header);
