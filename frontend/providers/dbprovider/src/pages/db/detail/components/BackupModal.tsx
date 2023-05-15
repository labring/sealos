import React, { useCallback, useRef, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Input,
  Box,
  Button,
  useTheme,
  Flex
} from '@chakra-ui/react';
import MyIcon from '@/components/Icon';
import { useConfirm } from '@/hooks/useConfirm';
import { createBackup } from '@/api/backup';
import { useMutation } from '@tanstack/react-query';
import { getErrText } from '@/utils/tools';
import { useToast } from '@/hooks/useToast';
import { DBTypeEnum } from '@/constants/db';

enum NavEnum {
  manual = 'manual',
  auto = 'auto'
}

const BackupModal = ({
  dbName,
  dbType,
  onClose,
  onSuccess
}: {
  dbName: string;
  dbType: `${DBTypeEnum}`;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const theme = useTheme();
  const { toast } = useToast();

  const { openConfirm, ConfirmChild } = useConfirm({
    title: '确认创建备份任务？',
    content: `建议在业务低峰期备份实例。 备份期间，请勿执行DDL操作，避免锁表导致备份失败。
若数据量较大，花费的时问可能较长，请耐心等待。 点击 【开始备份】
后，将在1分钟后开始备份。`
  });
  const [currentNav, setCurrentNav] = useState<`${NavEnum}`>(NavEnum.manual);
  const navStyle = useCallback(
    (nav: `${NavEnum}`) => ({
      px: 4,
      py: 3,
      borderRadius: 'md',
      cursor: 'pointer',
      ...(nav === currentNav
        ? {
            bg: '#F4F6F8',
            color: 'myGray.1000'
          }
        : {
            color: 'myGray.500',
            onClick: () => setCurrentNav(nav)
          })
    }),
    [currentNav]
  );

  const { mutate: onclickBackup, isLoading } = useMutation({
    mutationFn: () => createBackup({ dbName, dbType, storage: 1 }),
    onSuccess() {
      toast({
        status: 'success',
        title: '备份任务创建成功'
      });
      onClose();
    },
    onError(err) {
      toast({
        status: 'error',
        title: getErrText(err, '创建备份任务失败')
      });
    }
  });

  return (
    <>
      <Modal isOpen onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent maxW={'min(960px, 90vw)'} h={'480px'}>
          <ModalHeader>数据库备份</ModalHeader>
          <ModalCloseButton />
          <ModalBody display={'flex'} pb={8}>
            <Box flex={'0 0 220px'} pr={4} borderRight={theme.borders.sm} borderRightWidth={'2px'}>
              <Box {...navStyle(NavEnum.manual)}>手动备份</Box>
              <Box {...navStyle(NavEnum.auto)}>自动备份</Box>
            </Box>
            {currentNav === NavEnum.manual && (
              <Flex flex={'1 0 0'} flexDirection={'column'} alignItems={'center'}>
                <Box
                  w={'400px'}
                  bg={'#FFFAE5'}
                  borderRadius={'md'}
                  textAlign={'center'}
                  px={6}
                  py={4}
                >
                  <MyIcon name={'warning'} mb={2}></MyIcon>
                  <Box>
                    建议在业务低峰期备份实例。 备份期间，请勿执行DDL操作，避免锁表导致备份失败。
                    若数据量较大，花费的时问可能较长，请耐心等待。 点击 【开始备份】
                    后，将在1分钟后开始备份。
                  </Box>
                </Box>
                <Box mt={6}>
                  <Button
                    isLoading={isLoading}
                    variant={'primary'}
                    mr={3}
                    onClick={openConfirm(onclickBackup)}
                  >
                    xxx元 | 开始备份
                  </Button>
                  <Button>取消</Button>
                </Box>
              </Flex>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
      <ConfirmChild />
    </>
  );
};

export default BackupModal;
