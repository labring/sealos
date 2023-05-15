import React, { Dispatch, useCallback, useState } from 'react';
import { Box, Flex, Button, useDisclosure } from '@chakra-ui/react';
import type { DBDetailType } from '@/types/db';
import { useRouter } from 'next/router';
import { restartDB, pauseDBByName, startDBByName } from '@/api/db';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/hooks/useConfirm';
import { defaultDBDetail } from '@/constants/db';
import DBStatusTag from '@/components/DBStatusTag';
import MyIcon from '@/components/Icon';
import dynamic from 'next/dynamic';

const DelModal = dynamic(() => import('./DelModal'));
const BackupModal = dynamic(() => import('./BackupModal'));

const Header = ({
  db = defaultDBDetail,
  isLargeScreen = true,
  setShowSlider
}: {
  db: DBDetailType;
  isLargeScreen: boolean;
  setShowSlider: Dispatch<boolean>;
}) => {
  const router = useRouter();
  const { toast } = useToast();
  const {
    isOpen: isOpenDelModal,
    onOpen: onOpenDelModal,
    onClose: onCloseDelModal
  } = useDisclosure();
  const {
    isOpen: isOpenBackupModal,
    onOpen: onOpenBackupModal,
    onClose: onCloseBackupModal
  } = useDisclosure();
  const { openConfirm: openRestartConfirm, ConfirmChild: RestartConfirmChild } = useConfirm({
    content: '确认重启该应用?'
  });
  const { openConfirm: onOpenPause, ConfirmChild: PauseChild } = useConfirm({
    content: '请注意，暂停状态下无法变更应用，并且如果您使用了存储卷，存储券仍会收费，请确认！'
  });

  const [loading, setLoading] = useState(false);

  const handleRestartApp = useCallback(async () => {
    try {
      setLoading(true);
      await restartDB(db);
      toast({
        title: '重启成功',
        status: 'success'
      });
    } catch (error: any) {
      toast({
        title: typeof error === 'string' ? error : error.message || '重启出现了意外',
        status: 'error'
      });
      console.error(error);
    }
    setLoading(false);
  }, [db, toast]);

  const handlePauseApp = useCallback(async () => {
    try {
      setLoading(true);
      await pauseDBByName(db);
      toast({
        title: '应用已暂停',
        status: 'success'
      });
    } catch (error: any) {
      toast({
        title: typeof error === 'string' ? error : error.message || '暂停应用出现了意外',
        status: 'error'
      });
      console.error(error);
    }
    setLoading(false);
  }, [db, toast]);

  const handleStartApp = useCallback(async () => {
    try {
      setLoading(true);
      await startDBByName(db);
      toast({
        title: '集群已启动',
        status: 'success'
      });
    } catch (error: any) {
      toast({
        title: typeof error === 'string' ? error : error.message || '启动应用出现了意外',
        status: 'error'
      });
      console.error(error);
    }
    setLoading(false);
  }, [db, toast]);

  return (
    <Flex h={'86px'} alignItems={'center'}>
      <Button variant={'unstyled'} onClick={router.back} lineHeight={1}>
        <MyIcon name="arrowLeft" />
      </Button>
      <Box mx={5} fontSize={'3xl'} fontWeight={'bold'}>
        {db.dbName}
      </Box>
      <DBStatusTag status={db.status} conditions={db.conditions} showBorder />
      {!isLargeScreen && (
        <Box mx={4}>
          <Button
            flex={1}
            h={'36px'}
            borderColor={'myGray.200'}
            leftIcon={<MyIcon name="detail" w={'14px'} h={'14px'} transform={'translateY(3px)'} />}
            variant={'base'}
            bg={'white'}
            onClick={() => setShowSlider(true)}
          >
            详情
          </Button>
        </Box>
      )}
      <Box flex={1} />

      {/* btns */}
      {db.status.value !== 'Stopped' && (
        <Button
          mr={5}
          h={'36px'}
          borderColor={'myGray.200'}
          leftIcon={<MyIcon name={'change'} w={'14px'} />}
          isLoading={loading}
          variant={'base'}
          bg={'white'}
          onClick={() => {
            router.push(`/db/edit?name=${db.dbName}`);
          }}
        >
          变更
        </Button>
      )}
      {db.status.value === 'Stopped' ? (
        <Button
          mr={5}
          h={'36px'}
          borderColor={'myGray.200'}
          leftIcon={<MyIcon name="continue" w={'14px'} />}
          isLoading={loading}
          variant={'base'}
          bg={'white'}
          onClick={handleStartApp}
        >
          继续
        </Button>
      ) : (
        <Button
          mr={5}
          h={'36px'}
          borderColor={'myGray.200'}
          leftIcon={<MyIcon name="pause" w={'14px'} />}
          isLoading={loading}
          variant={'base'}
          bg={'white'}
          onClick={onOpenPause(handlePauseApp)}
        >
          暂停
        </Button>
      )}

      {/* {db.status.value === 'Running' && (
        <>
          <Button
            mr={5}
            h={'36px'}
            borderColor={'myGray.200'}
            variant={'base'}
            bg={'white'}
            leftIcon={<MyIcon name="restart" w={'14px'} h={'14px'} />}
            onClick={onOpenBackupModal}
            isLoading={loading}
          >
            备份
          </Button>
        </>
      )} */}

      {db.status.value !== 'Stopped' && (
        <Button
          mr={5}
          h={'36px'}
          borderColor={'myGray.200'}
          variant={'base'}
          bg={'white'}
          leftIcon={<MyIcon name="restart" w={'14px'} h={'14px'} />}
          onClick={openRestartConfirm(handleRestartApp)}
          isLoading={loading}
        >
          重启
        </Button>
      )}

      <Button
        h={'36px'}
        borderColor={'myGray.200'}
        leftIcon={<MyIcon name="delete" w={'14px'} h={'14px'} />}
        variant={'base'}
        bg={'white'}
        _hover={{
          color: '#FF324A'
        }}
        isDisabled={loading}
        onClick={onOpenDelModal}
      >
        删除
      </Button>

      {/* modal */}
      <RestartConfirmChild />
      <PauseChild />
      {isOpenDelModal && (
        <DelModal
          dbName={db.dbName}
          onClose={onCloseDelModal}
          onSuccess={() => router.replace('/dbs')}
        />
      )}
      {isOpenBackupModal && (
        <BackupModal
          dbName={db.dbName}
          dbType={db.dbType}
          onClose={onCloseBackupModal}
          onSuccess={() => {
            toast({
              status: 'success',
              title: '已创建备份任务'
            });
          }}
        />
      )}
    </Flex>
  );
};

export default Header;
