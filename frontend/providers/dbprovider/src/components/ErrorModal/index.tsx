import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Box,
  ModalFooter,
  Button
} from '@chakra-ui/react';
import MyIcon from '@/components/Icon';
import { useTranslation } from 'next-i18next';
import { ResponseCode } from '@/types/response';
import { sealosApp } from 'sealos-desktop-sdk/app';

const ErrorModal = ({
  title,
  content,
  onClose,
  errorCode
}: {
  title: string;
  content: string;
  onClose: () => void;
  errorCode?: ResponseCode;
}) => {
  const { t } = useTranslation();

  const openCostCenterApp = () => {
    sealosApp.runEvents('openDesktopApp', {
      appKey: 'system-costcenter',
      query: {
        openRecharge: 'true'
      }
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader display={'flex'} alignItems={'center'} bg={'#fff'} borderBottom={'none'}>
          <MyIcon color={'#CA8A04'} widths={'16px'} height={'16px'} name="warning"></MyIcon>
          <Box ml={3} fontSize={'xl'}>
            {title}
          </Box>
        </ModalHeader>
        <ModalCloseButton fontSize={'16px'} />
        <ModalBody maxH={'50vh'} overflow={'auto'} whiteSpace={'pre-wrap'}>
          {content}
        </ModalBody>
        <ModalFooter>
          <Button
            onClick={() => {
              onClose();
            }}
            variant={'outline'}
          >
            {t('Cancel')}
          </Button>
          <Button
            ml={'12px'}
            onClick={() => {
              if (errorCode === ResponseCode.BALANCE_NOT_ENOUGH) {
                openCostCenterApp();
              }
              onClose();
            }}
          >
            {errorCode === ResponseCode.BALANCE_NOT_ENOUGH ? t('add_credit') : t('confirm')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ErrorModal;
