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
import { delCronJobByName } from '@/api/job';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from 'next-i18next';

const DelModal = ({
  jobName,
  onClose,
  onSuccess
}: {
  jobName: string;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDelApp = useCallback(async () => {
    try {
      setLoading(true);
      await delCronJobByName(jobName);
      toast({
        title: t('Delete successful'),
        status: 'success'
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: typeof error === 'string' ? error : error.message || t('Delete Failed'),
        status: 'error'
      });
      console.error(error);
    }
    setLoading(false);
  }, [jobName, toast, t, onSuccess, onClose]);

  return (
    <Modal isOpen onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{t('Delete Warning')}</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={4}>
          <Box color={'myGray.600'}>
            {t('Delete Hint')}
            <Box my={3}>
              {t('Please Enter')}{' '}
              <Box as={'span'} color={'myGray.900'} fontWeight={'bold'} userSelect={'all'}>
                {jobName}
              </Box>{' '}
              {t('Confirm')}
            </Box>
          </Box>

          <Input
            placeholder={`${t('Please Enter')}：${jobName}`}
            value={inputValue}
            bg={'myWhite.300'}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose} variant={'base'}>
            {t('Cancel')}
          </Button>
          <Button
            colorScheme="red"
            ml={3}
            variant={'solid'}
            isDisabled={inputValue !== jobName}
            isLoading={loading}
            onClick={handleDelApp}
          >
            {t('Confirm Delete')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default DelModal;
