import {
  Box,
  Button,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Textarea
} from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { editDevboxVersion } from '@/api/devbox';
import { DevboxVersionListItemType } from '@/types/devbox';

const EditVersionDesModal = ({
  version,
  onClose,
  isOpen,
  onSuccess
}: {
  version: DevboxVersionListItemType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const t = useTranslations();
  const { message: toast } = useMessage();
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(version.description);
  const handleEditVersionDes = useCallback(async () => {
    try {
      setLoading(true);
      await editDevboxVersion({
        name: version.name,
        releaseDes: inputValue
      });
      toast({
        title: t('edit_successful'),
        status: 'success'
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: typeof error === 'string' ? error : error.message || t('edit_failed'),
        status: 'error'
      });
      console.error(error);
    }
    setLoading(false);
  }, [version.name, inputValue, toast, t, onSuccess, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} lockFocusAcrossFrames={false}>
      <ModalOverlay />
      <ModalContent minW={'500px'} mt={'200px'} minH={'300px'}>
        <ModalHeader>
          <Flex alignItems={'center'} gap={'10px'}>
            {t('edit_version_description')}
          </Flex>
        </ModalHeader>
        <ModalCloseButton top={'10px'} right={'10px'} />
        <ModalBody pb={4}>
          <Flex alignItems={'start'} gap={'5px'}>
            <Box w={'100px'}>{t('version_description')}</Box>
            <Textarea
              value={inputValue}
              minH={'150px'}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={t('enter_version_description')}
            />
          </Flex>
        </ModalBody>
        <ModalFooter>
          <Button ml={3} variant={'solid'} onClick={handleEditVersionDes} isLoading={loading}>
            {t('save')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default EditVersionDesModal;
