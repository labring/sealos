import { delInstanceByName, deleteAllResources } from '@/api/delete';
import { useTemplateOperation } from '@/hooks/useTemplateOperation';
import { useResourceStore } from '@/store/resource';
import ErrorModal from '@/components/ErrorModal';
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
import { useTranslation } from 'next-i18next';
import { useCallback, useState } from 'react';

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
  const { loading, executeOperation, errorModalState, closeErrorModal } = useTemplateOperation();

  const handleDelApp = useCallback(async () => {
    await executeOperation(
      async () => {
        await delInstanceByName(name);
        await deleteAllResources(resource);
      },
      {
        successMessage: t('Delete successful'),
        errorMessage: t('Delete Failed'),
        onSuccess: () => {
          onSuccess();
          onClose();
        }
      }
    );
  }, [name, resource, t, executeOperation, onSuccess, onClose]);

  return (
    <>
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
                <Box
                  as={'span'}
                  color={'myGray.900'}
                  fontWeight={'bold'}
                  userSelect={'all'}
                  px="4px"
                >
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
            <Button onClick={onClose} variant={'outline'}>
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

      {errorModalState.isOpen && (
        <ErrorModal
          title={errorModalState.title}
          errorCode={errorModalState.errorCode}
          onClose={closeErrorModal}
        />
      )}
    </>
  );
};

export default DelModal;
