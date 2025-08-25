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
import { useToast } from '@/hooks/useToast';
import { useTranslation } from 'next-i18next';
// import { deleteAllResources } from '@/api/delete';
import { useResourceStore } from '@/store/resource';

const DelModal = ({
  name,
  onClose,
  onSuccess
}: {
  name: string;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const { t } = useTranslation();
  const { resource } = useResourceStore();
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDelApp = useCallback(async () => {
    try {
      setLoading(true);
      // await deleteAllResources(name);
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
  }, [name, toast, t, onSuccess, onClose]);

  return (
    <Modal isOpen onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{t('Deletion warning')}</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={4}>
          <Box color={'myGray.600'}>
            {t('delete message')}
            <Box my={3}>
              {t('Please Enter')}
              <Box as={'span'} color={'myGray.900'} fontWeight={'bold'} userSelect={'all'} px="4px">
                {name}
              </Box>
              {t('Confirm')}
            </Box>
          </Box>

          <Input
            placeholder={`${t('Please Enter')}：${name}`}
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
            isDisabled={inputValue !== name}
            isLoading={loading}
            onClick={handleDelApp}
          >
            {t('Confirm deletion')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default DelModal;
