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
    <Modal isOpen={true} onClose={onClose} lockFocusAcrossFrames={false}>
      <ModalOverlay />
      <ModalContent py={3}>
        <ModalHeader display={'flex'} alignItems={'center'} color={'myRed.600'}>
          <MyIcon name="warning" width={'14px'}></MyIcon>
          <Box ml={3} fontSize={'xl'}>
            {title}
          </Box>
        </ModalHeader>
        <ModalCloseButton color={'myRed.600'} fontSize={'16px'} transform={'translateY(10px)'} />
        <ModalBody maxH={'50vh'} overflow={'auto'} whiteSpace={'pre-wrap'}>
          {content}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default ErrorModal;
