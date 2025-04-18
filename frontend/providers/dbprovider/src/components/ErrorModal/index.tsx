import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Box
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { keyword } from '@/utils/i18n-client';

const ErrorModal = ({
  title,
  content,
  onClose
}: {
  title: string;
  content: string;
  onClose: () => void;
}) => {
  const regex = /^[a-z_]+$/;
  if (regex.test(title) || regex.test(content)) {
    const { t } = useTranslation();
    if (regex.test(title)) {
      title = t(title as keyword);
    }
    if (regex.test(content)) {
      content = t(content as keyword);
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} lockFocusAcrossFrames={false}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader
          display={'flex'}
          alignItems={'center'}
          color={'grayModern.900'}
          fontWeight={'bold'}
          fontSize={'lg'}
        >
          <Box>{title}</Box>
        </ModalHeader>
        <ModalCloseButton top={'10px'} right={'10px'} />
        <ModalBody maxH={'50vh'} overflow={'auto'} whiteSpace={'pre-wrap'}>
          {content}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default ErrorModal;
