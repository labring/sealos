import React, { useState, useCallback } from 'react';
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
  Button
} from '@chakra-ui/react';
import { delAppByName } from '@/api/app';
import { useToast } from '@/hooks/useToast';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { useMessage } from '@sealos/ui';

const DelModal = ({
  appName,
  onClose,
  onSuccess
}: {
  appName: string;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const { message: toast } = useMessage();
  const router = useRouter();

  const handleDelApp = useCallback(async () => {
    try {
      setLoading(true);
      await delAppByName(appName);
      toast({
        title: `${t('success')}`,
        status: 'success'
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: typeof error === 'string' ? error : error.message || '删除出现了意外',
        status: 'error'
      });
      console.error(error);
    }
    setLoading(false);
  }, [appName, toast, t, onSuccess, onClose]);

  return (
    <Modal isOpen onClose={onClose} lockFocusAcrossFrames={false}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{t('Deletion warning')} </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box color={'myGray.600'}>
            {t(
              'Are you sure you want to delete this application? If you proceed, all data for this project will be deleted'
            )}
            <Box my={3}>
              {t('Please enter')}{' '}
              <Box as={'span'} color={'myGray.900'} fontWeight={'bold'} userSelect={'all'}>
                {appName}
              </Box>{' '}
              {t('To Confirm')}
            </Box>
          </Box>

          <Input
            placeholder={t('please enter app name', { appName }) || ''}
            value={inputValue}
            bg={'myWhite.300'}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </ModalBody>
        <ModalFooter>
          <Button width={'64px'} onClick={onClose} variant={'outline'}>
            {t('Cancel')}
          </Button>
          <Button
            width={'64px'}
            ml={3}
            variant={'solid'}
            isDisabled={inputValue !== appName}
            isLoading={loading}
            onClick={handleDelApp}
          >
            {t('Delete')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default DelModal;
