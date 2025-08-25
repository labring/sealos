import MyIcon from '@/components/Icon';
import { DBSource } from '@/types/db';
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
  ModalOverlay
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import { sealosApp } from 'sealos-desktop-sdk/app';

const UpdateModal = ({
  isOpen,
  onClose,
  source
}: {
  isOpen: boolean;
  onClose: () => void;
  source?: DBSource;
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const openTemplateApp = () => {
    if (!source?.hasSource) return;
    if (source.sourceType === 'sealaf') {
      sealosApp.runEvents('openDesktopApp', {
        appKey: 'system-sealaf',
        pathname: '/',
        query: { instanceName: source.sourceName }
      });
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} lockFocusAcrossFrames={false}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <Flex alignItems={'center'} gap={'10px'}>
            <MyIcon name="warning" width={'20px'} h={'20px'} />
            {t('remind')}
          </Flex>
        </ModalHeader>
        <ModalCloseButton top={'10px'} right={'10px'} />
        <ModalBody pb={4}>
          <Box color={'grayModern.600'}>{t('update_sealaf_app_tip')}</Box>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose} variant={'outline'}>
            {t('Cancel')}
          </Button>

          <Button ml={3} variant={'solid'} isLoading={loading} onClick={openTemplateApp}>
            {t('confirm_to_go')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default UpdateModal;
