import React, { useCallback, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Box,
  Button,
  useTheme,
  Flex,
  Input
} from '@chakra-ui/react';
import { useConfirm } from '@/hooks/useConfirm';
import { createBackup } from '@/api/backup';
import { useMutation } from '@tanstack/react-query';
import { getErrText } from '@/utils/tools';
import { useToast } from '@/hooks/useToast';
import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz1234567890', 6);
import Tip from '@/components/Tip';
import { InfoOutlineIcon } from '@chakra-ui/icons';
import { useTranslation } from 'next-i18next';
import { useForm } from 'react-hook-form';

enum NavEnum {
  manual = 'manual',
  auto = 'auto'
}

const BackupModal = ({
  dbName,
  onClose,
  onSuccess
}: {
  dbName: string;
  onClose: () => void;
  onSuccess?: () => void;
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { toast } = useToast();

  const { openConfirm, ConfirmChild } = useConfirm({
    title: t('Confirm') || 'Confirm',
    content: t('Manual Backup Tip'),
    confirmText: 'Start Backup'
  });
  const [currentNav, setCurrentNav] = useState<`${NavEnum}`>(NavEnum.manual);
  const {
    register: manualRegister,
    handleSubmit: handleSubmitManual,
    getValues: getManualValues
  } = useForm({
    defaultValues: {
      backupName: `${dbName}-${nanoid()}`,
      remark: ''
    }
  });

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
    mutationFn: () => {
      return createBackup({
        backupName: getManualValues('backupName'),
        remark: getManualValues('remark'),
        dbName
      });
    },
    onSuccess() {
      toast({
        status: 'success',
        title: t('The backup task has been created successfully !')
      });
      onClose();
    },
    onError(err) {
      toast({
        status: 'error',
        title: t(getErrText(err, 'The backup task has been created failed !'))
      });
    }
  });

  return (
    <>
      <Modal isOpen onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent maxW={'min(960px, 90vw)'} h={'480px'}>
          <ModalHeader>{t('Backup Database')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody display={'flex'} pb={8}>
            <Box flex={'0 0 220px'} pr={4} borderRight={theme.borders.sm} borderRightWidth={'2px'}>
              <Box {...navStyle(NavEnum.manual)}>{t('Manual Backup')}</Box>
              {/* <Box {...navStyle(NavEnum.auto)}>{t('Auto Backup')}</Box> */}
            </Box>
            {currentNav === NavEnum.manual && (
              <Flex flexDirection={'column'} px={'50px'}>
                <Tip
                  icon={<InfoOutlineIcon fontSize={'16px'} />}
                  size="sm"
                  text={t('Manual Backup Tip')}
                />
                <Box flex={1}>
                  <Flex mt={8} alignItems={'center'}>
                    <Box flex={'0 0 80px'}>{t('Backup Name')}</Box>
                    <Input
                      maxW={'300px'}
                      bg={'myWhite.300'}
                      {...manualRegister('backupName', {
                        required: t('Backup Name cannot empty') || 'Backup Name cannot empty'
                      })}
                    />
                  </Flex>
                  <Flex mt={7} alignItems={'center'}>
                    <Box flex={'0 0 80px'}>{t('Remark')}</Box>
                    <Input maxW={'300px'} bg={'myWhite.300'} {...manualRegister('remark')} />
                  </Flex>
                </Box>
                <Box mt={6} textAlign={'end'}>
                  <Button
                    isLoading={isLoading}
                    variant={'primary'}
                    onClick={() => handleSubmitManual(openConfirm(onclickBackup))()}
                  >
                    {t('Start Backup')}
                  </Button>
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
