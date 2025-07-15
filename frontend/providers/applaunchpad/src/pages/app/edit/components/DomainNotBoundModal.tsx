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
import { useTranslation } from 'next-i18next';

export function DomainNotBoundModal({
  isOpen,
  onClose,
  onConfirm
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <Flex alignItems={'center'} gap={'10px'}>
            <Text color={'orange.400'}>
              <TriangleAlert size={20} />
            </Text>
            <Text>{t('domain-not-bound-modal-title')}</Text>
          </Flex>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Alert status="warning" variant="subtle" borderRadius={'lg'}>
            <AlertDescription textColor={'orange.600'}>
              {t('domain-not-bound-modal-warning')}
            </AlertDescription>
          </Alert>

          <Text mt={2}>{t('domain-not-bound-modal-description')}</Text>
        </ModalBody>

        <ModalFooter>
          <Button variant={'outline'} mr={3} onClick={onClose}>
            {t('domain-not-bound-modal-cancel')}
          </Button>
          <Button onClick={onConfirm}>{t('domain-not-bound-modal-confirm')}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
