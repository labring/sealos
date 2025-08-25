import {
  Box,
  Button,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay
} from '@chakra-ui/react';
import { useCallback, useState } from 'react';
import { updateCloudServerStatus } from '@/api/cloudserver';
import { HandleEnum } from '@/types/cloudserver';
import { useMessage } from '@sealos/ui';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';

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
      await updateCloudServerStatus({
        instanceName: appName,
        handle: HandleEnum.Delete
      });
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
    <Modal isOpen onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{t('Deletion warning')} </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box color={'myGray.600'}>
            {t('delete cloud server tip')}
            <Box my={3}>
              {t('Please enter')}{' '}
              <Box as={'span'} color={'myGray.900'} fontWeight={'bold'} userSelect={'all'}>
                {appName}
              </Box>{' '}
              {t('Confirm')}
            </Box>
          </Box>

          <Input
            placeholder={`请输入：${appName}`}
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
