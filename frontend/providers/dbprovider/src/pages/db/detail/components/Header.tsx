import { pauseDBByName, restartDB, startDBByName } from '@/api/db';
import DBStatusTag from '@/components/DBStatusTag';
import MyIcon from '@/components/Icon';
import { defaultDBDetail } from '@/constants/db';
import { useConfirm } from '@/hooks/useConfirm';
import type { DBDetailType } from '@/types/db';
import { Box, Button, Flex, useDisclosure } from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import React, { Dispatch, useCallback, useState } from 'react';
import UpdateModal from './UpdateModal';

const DelModal = dynamic(() => import('./DelModal'));

const Header = ({
  db = defaultDBDetail,
  isLargeScreen = true,
  setShowSlider
}: {
  db: DBDetailType;
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

  const handleRestartApp = useCallback(async () => {
    try {
      setLoading(true);
      await restartDB(db);
      toast({
        title: 'restart_success',
        status: 'success'
      });
    } catch (error: any) {
      toast({
        title: typeof error === 'string' ? error : error.message || t('restart_error'),
        status: 'error'
      });
      console.error(error);
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
    }
    setLoading(false);
  }, [db, t, toast]);

  const handleStartApp = useCallback(async () => {
    try {
      setLoading(true);
      await startDBByName(db);
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
  }, [db, t, toast]);

  return (
    <Flex h={'60px'} alignItems={'center'}>
      <Flex alignItems={'center'} cursor={'pointer'} onClick={() => router.replace('/dbs')}>
        <MyIcon name="arrowLeft" w={'24px'} h={'24px'} color={'grayModern.600'} />
        <Box ml={'4px'} mr={'12px'} fontWeight={'500'} color={'grayModern.900'} fontSize={'18px'}>
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
      {db.status.value !== 'Stopped' && (
        <Button
          mr={'12px'}
          minW={'75px'}
          h={'32px'}
          fontSize={'12px'}
          variant={'outline'}
          leftIcon={<MyIcon name={'change'} w={'16px'} />}
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
      {db.status.value === 'Stopped' ? (
        <Button
          mr={'12px'}
          minW={'75px'}
          h={'32px'}
          fontSize={'12px'}
          variant={'outline'}
          leftIcon={<MyIcon name="continue" w={'16px'} />}
          isLoading={loading}
          onClick={handleStartApp}
        >
          {t('Continue')}
        </Button>
      ) : (
        <Button
          mr={'12px'}
          minW={'75px'}
          h={'32px'}
          fontSize={'12px'}
          variant={'outline'}
          leftIcon={<MyIcon name="pause" w={'16px'} />}
          isLoading={loading}
          isDisabled={db.status.value === 'Updating'}
          onClick={onOpenPause(handlePauseApp)}
        >
          {t('Pause')}
        </Button>
      )}

      {db.status.value !== 'Stopped' && (
        <Button
          mr={'12px'}
          minW={'75px'}
          h={'32px'}
          fontSize={'12px'}
          variant={'outline'}
          leftIcon={<MyIcon name="restart" w={'16px'} />}
          isDisabled={db.status.value === 'Updating'}
          onClick={openRestartConfirm(handleRestartApp)}
          isLoading={loading}
        >
          {t('Restart')}
        </Button>
      )}

      <Button
        minW={'75px'}
        h={'32px'}
        fontSize={'12px'}
        variant={'outline'}
        leftIcon={<MyIcon name="delete" w={'16px'} />}
        isLoading={loading}
        isDisabled={db.status.value === 'Updating'}
        _hover={{
          color: '#FF324A'
        }}
        onClick={onOpenDelModal}
      >
        {t('Delete')}
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
