import React from 'react';
import {
  Box,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton
} from '@chakra-ui/react';

const ConfigMapDetailModal = ({
  mountPath,
  value,
  onClose
}: {
  mountPath: string;
  value: string;
  onClose: () => void;
}) => {
  return (
    <Modal isOpen onClose={onClose}>
      <ModalOverlay />
      <ModalContent top={'10vh'} backgroundColor={'#F5F5F5'}>
        <ModalHeader>{mountPath}</ModalHeader>
        <ModalCloseButton />
        <ModalBody maxH={'60vh'} overflowY={'auto'} whiteSpace={'pre'}>
          {value}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default ConfigMapDetailModal;
