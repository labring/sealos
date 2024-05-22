import { delDBByName } from '@/api/db';
import MyIcon from '@/components/Icon';
import {
  Box,
  Button,
  Flex,
  Icon,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay
} from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useCallback, useState } from 'react';

const DelModal = ({
  dbName,
  onClose,
  onSuccess
}: {
  dbName: string;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const { message: toast } = useMessage();

  const handleDelApp = useCallback(async () => {
    try {
      setLoading(true);
      await delDBByName(dbName);
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
  }, [dbName, toast, t, onSuccess, onClose]);

  return (
    <Modal isOpen onClose={onClose} lockFocusAcrossFrames={false}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{t('Delete Warning')}</ModalHeader>
        <ModalCloseButton top={'10px'} right={'10px'} />
        <ModalBody pb={4}>
          <Box color={'grayModern.600'}>
            {t('Delete Hint')}
            <Box my={3}>
              {t('Please Enter')}{' '}
              <Box as={'span'} color={'grayModern.900'} fontWeight={'bold'} userSelect={'all'}>
                {dbName}
              </Box>{' '}
              {t('Confirm')}
            </Box>
          </Box>

          <Input
            placeholder={`${t('Please Enter')}：${dbName}`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose} variant={'outline'}>
            {t('Cancel')}
          </Button>
          <Button
            ml={3}
            variant={'solid'}
            isDisabled={inputValue !== dbName}
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
