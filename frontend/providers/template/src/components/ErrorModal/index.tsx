import {
  Box,
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import React, { useCallback } from 'react';
import { ResponseCode } from '@/types/response';
import MyIcon from '../Icon';
import { useRouter } from 'next/router';

interface Props {
  title: string;
  errorCode?: ResponseCode;
  onClose: () => void;
}

const ErrorModal = ({ title, errorCode, onClose }: Props) => {
  const { t } = useTranslation();
  const router = useRouter();

  const handleRecharge = useCallback(() => {
    router.push('/pricing');
    onClose();
  }, [router, onClose]);

  const getButtonText = () => {
    if (errorCode === ResponseCode.BALANCE_NOT_ENOUGH) {
      return t('add_credit');
    }
    return t('Confirm');
  };

  const handleConfirm = () => {
    if (errorCode === ResponseCode.BALANCE_NOT_ENOUGH) {
      handleRecharge();
    } else {
      onClose();
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader display={'flex'} alignItems={'center'} bg={'#fff'} borderBottom={'none'}>
          <MyIcon color={'#CA8A04'} name="warning" width={'16px'} height={'16px'} />
          <Box ml={3} fontSize={'xl'}>
            {t('Prompt')}
          </Box>
        </ModalHeader>
        <ModalCloseButton fontSize={'16px'} />
        <ModalBody maxH={'50vh'} overflow={'auto'} whiteSpace={'pre-wrap'}>
          {title}
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose} variant={'outline'}>
            {t('Cancel')}
          </Button>
          <Button ml={'12px'} onClick={handleConfirm}>
            {getButtonText()}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ErrorModal;
