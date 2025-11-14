import { Modal, ModalOverlay, ModalContent, ModalCloseButton } from '@chakra-ui/react';

import SigninComponent from '../v2/Sign';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered closeOnOverlayClick={false}>
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent bg={'white'} maxW="440px">
        <ModalCloseButton />
        <SigninComponent isModal />
      </ModalContent>
    </Modal>
  );
}
