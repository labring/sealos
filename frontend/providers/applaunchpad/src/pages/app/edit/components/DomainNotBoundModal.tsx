import {
  Modal,
  ModalContent,
  ModalBody,
  ModalFooter,
  ModalOverlay,
  ModalCloseButton,
  Button,
  ModalHeader,
  Alert,
  AlertDescription,
  Text,
  Flex
} from '@chakra-ui/react';
import { TriangleAlert } from 'lucide-react';

export function DomainNotBoundModal({
  isOpen,
  onClose,
  onConfirm
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <Flex alignItems={'center'} gap={'10px'}>
            <Text color={'orange.400'}>
              <TriangleAlert size={20} />
            </Text>
            <Text>Domain Not Bound</Text>
          </Flex>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Alert status="warning" variant="subtle" borderRadius={'lg'}>
            <AlertDescription textColor={'orange.600'}>
              DNS records are not active yet, so your domain isn&apos;t bound. Closing the pop-up
              requires re-entering the domain.
            </AlertDescription>
          </Alert>

          <Text mt={2}>Are you sure you want to close the pop-up?</Text>
        </ModalBody>

        <ModalFooter>
          <Button variant={'outline'} mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Confirm</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
