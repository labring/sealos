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
import MyIcon from '@/components/Icon';

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
    <Modal isOpen={true} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader display={'flex'} alignItems={'center'} color={'myRed.600'}>
          <MyIcon name="warning"></MyIcon>
          <Box ml={3} fontSize={'xl'}>
            {title}
          </Box>
        </ModalHeader>
        <ModalCloseButton color={'myRed.600'} fontSize={'16px'} />
        <ModalBody maxH={'50vh'} overflow={'auto'} whiteSpace={'pre-wrap'}>
          {content}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default ErrorModal;
