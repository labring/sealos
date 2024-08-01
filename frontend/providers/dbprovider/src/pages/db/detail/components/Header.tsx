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
    <Flex h={'86px'} alignItems={'center'}>
      <Flex alignItems={'center'} cursor={'pointer'} onClick={() => router.replace('/dbs')}>
        <MyIcon name="arrowLeft" w={'24px'} />
        <Box ml={'4px'} mr={'18px'} fontWeight={'bold'} color={'grayModern.900'} fontSize={'2xl'}>
          {router.query.name || db.dbName}
        </Box>
      </Flex>
      <DBStatusTag status={db.status} conditions={db.conditions} />
      {!isLargeScreen && (
        <Box mx={4}>
          <Button
            minW={'97px'}
            h={'40px'}
            variant={'outline'}
            leftIcon={<MyIcon name="detail" w={'16px'} />}
            onClick={() => setShowSlider(true)}
          >
            {t('details')}
          </Button>
        </Box>
      )}
      <Box flex={1} />

      {/* btns */}
      {/* Migrate */}
      {/* <Button
        mr={5}
        h={'36px'}
        borderColor={'myGray.200'}
        leftIcon={<MyIcon name={'change'} w={'20px'} />}
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
          mr={5}
          minW={'97px'}
          h={'40px'}
          variant={'outline'}
          leftIcon={<MyIcon name={'change'} w={'20px'} />}
          isLoading={loading}
          isDisabled={db.status.value === 'Updating' && !db.isDiskSpaceOverflow}
          onClick={() => {
            router.push(`/db/edit?name=${db.dbName}`);
          }}
        >
          {t('update')}
        </Button>
      )}
      {db.status.value === 'Stopped' ? (
        <Button
          mr={5}
          minW={'97px'}
          h={'40px'}
          variant={'outline'}
          leftIcon={<MyIcon name="continue" w={'20px'} />}
          isLoading={loading}
          onClick={handleStartApp}
        >
          {t('Continue')}
        </Button>
      ) : (
        <Button
          mr={5}
          minW={'97px'}
          h={'40px'}
          variant={'outline'}
          leftIcon={<MyIcon name="pause" w={'20px'} />}
          isLoading={loading}
          isDisabled={db.status.value === 'Updating'}
          onClick={onOpenPause(handlePauseApp)}
        >
          {t('Pause')}
        </Button>
      )}

      {db.status.value !== 'Stopped' && (
        <Button
          mr={5}
          minW={'97px'}
          h={'40px'}
          variant={'outline'}
          leftIcon={<MyIcon name="restart" w={'20px'} />}
          isDisabled={db.status.value === 'Updating'}
          onClick={openRestartConfirm(handleRestartApp)}
          isLoading={loading}
        >
          {t('Restart')}
        </Button>
      )}

      <Button
        minW={'97px'}
        h={'40px'}
        variant={'outline'}
        leftIcon={<MyIcon name="delete" w={'20px'} />}
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
          labels={db.labels}
          dbName={db.dbName}
          onClose={onCloseDelModal}
          onSuccess={() => router.replace('/dbs')}
        />
      )}
    </Flex>
  );
};

export default React.memo(Header);
