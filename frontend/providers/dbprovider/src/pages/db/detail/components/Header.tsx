import { pauseDBByName, restartDB, startDBByName, type DatabaseAlertItem } from '@/api/db';
import DBStatusTag from '@/components/DBStatusTag';
import MyIcon from '@/components/Icon';
import { DBStatusEnum, defaultDBDetail, isDBOperationLocked } from '@/constants/db';
import { useConfirm } from '@/hooks/useConfirm';
import { useDBOperation } from '@/hooks/useDBOperation';
import type { DBDetailType } from '@/types/db';
import {
  Box,
  Button,
  Flex,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Skeleton,
  useDisclosure
} from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import React, { Dispatch, useCallback, useState } from 'react';
import { sealosApp } from 'sealos-desktop-sdk/app';
import UpdateModal from './UpdateModal';
import { DATAFLOW_APP_KEY, DATAFLOW_SUPPORTED_TYPES } from '@/constants/dataflow';
import { ConnectionInfo } from './AppBaseInfo';
import { getLangStore } from '@/utils/cookieUtils';
import { useClientAppConfig } from '@/hooks/useClientAppConfig';
import { ArrowLeft, Trash2, Settings } from 'lucide-react';
const DelModal = dynamic(() => import('./DelModal'));
const ErrorModal = dynamic(() => import('@/components/ErrorModal'));

const Header = ({
  db = defaultDBDetail,
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
  const config = useClientAppConfig();
  const isOperationLocked = isDBOperationLocked(db.status.value);
  const canUpdate =
    !isOperationLocked || (db.status.value === DBStatusEnum.Updating && db.isDiskSpaceOverflow);

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

  const getManageDataDisabledReason = useCallback(() => {
    if (!DATAFLOW_SUPPORTED_TYPES.has(db.dbType)) {
      return t('manage_data_disabled_unsupported_type');
    }
    if (db.status.value !== 'Running') {
      return t('manage_data_disabled_not_running');
    }
    return '';
  }, [db.dbType, db.status.value, t]);

  const manageDataDisabledReason = getManageDataDisabledReason();
  const manageDataButton = (
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
      isDisabled={!!manageDataDisabledReason}
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
  );

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
            isDisabled={isOperationLocked}
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
                isDisabled={isOperationLocked}
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
                  isDisabled={!canUpdate}
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
                  isDisabled={isOperationLocked}
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

          {config.dataflowEnabled &&
            (manageDataDisabledReason ? (
              <Popover trigger="hover" placement="top" openDelay={200}>
                <PopoverTrigger>
                  <Box as="span" display="inline-flex">
                    {manageDataButton}
                  </Box>
                </PopoverTrigger>
                <PopoverContent
                  w={'fit-content'}
                  maxW={'240px'}
                  px={'12px'}
                  py={'8px'}
                  borderRadius={'6px'}
                  borderColor={'grayModern.200'}
                  boxShadow={'0px 8px 24px rgba(17, 24, 36, 0.12)'}
                  color={'grayModern.700'}
                  fontSize={'12px'}
                >
                  <PopoverArrow />
                  <PopoverBody p={0}>{manageDataDisabledReason}</PopoverBody>
                </PopoverContent>
              </Popover>
            ) : (
              manageDataButton
            ))}
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
