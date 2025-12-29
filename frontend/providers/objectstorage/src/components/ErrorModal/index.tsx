import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  ModalCloseButton,
  Box
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { ResponseCode } from '@/types/response';
import { sealosApp } from 'sealos-desktop-sdk/app';
import InfoCircleIcon from '@/components/Icons/InfoCircleIcon';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorCode?: number;
  errorMessage?: string;
}

export default function ErrorModal({ isOpen, onClose, errorCode, errorMessage }: ErrorModalProps) {
  const { t } = useTranslation('common');

  const openCostCenterApp = () => {
    sealosApp.runEvents('openDesktopApp', {
      appKey: 'system-costcenter',
      query: {
        openRecharge: 'true'
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader display={'flex'} alignItems={'center'} bg={'#fff'} borderBottom={'none'}>
          <InfoCircleIcon w={'16px'} h={'16px'} color={'#CA8A04'} />
          <Box ml={3} fontSize={'xl'}>
            {t('operation_failed')}
          </Box>
        </ModalHeader>
        <ModalCloseButton fontSize={'16px'} />
        <ModalBody maxH={'50vh'} overflow={'auto'} whiteSpace={'pre-wrap'}>
          {errorMessage}
        </ModalBody>
        <ModalFooter>
          <Button
            onClick={() => {
              if (errorCode === ResponseCode.BALANCE_NOT_ENOUGH) {
                openCostCenterApp();
              }
              onClose();
            }}
          >
            {errorCode === ResponseCode.BALANCE_NOT_ENOUGH ? t('add_credit') : t('Confirm')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
