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

const ErrorModal = ({
  title,
  content,
  onClose
}: {
  title: string;
  content: string;
  onClose: () => void;
}) => {
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
