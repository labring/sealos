import React, { useEffect, useState } from 'react';
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
import { getPaymentConfig } from '@/api/platform';

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
  const [paymentEnabled, setPaymentEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let ignore = false;

    if (errorCode !== ResponseCode.BALANCE_NOT_ENOUGH) {
      setPaymentEnabled(null);
      return;
    }

    setPaymentEnabled(null);
    getPaymentConfig()
      .then((config) => {
        if (!ignore) {
          setPaymentEnabled(config.paymentEnabled);
        }
      })
      .catch(() => {
        if (!ignore) {
          setPaymentEnabled(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [errorCode]);

  const shouldRecharge = errorCode === ResponseCode.BALANCE_NOT_ENOUGH && paymentEnabled === true;
  const isCheckingPayment =
    errorCode === ResponseCode.BALANCE_NOT_ENOUGH && paymentEnabled === null;

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
          {(errorCode !== ResponseCode.BALANCE_NOT_ENOUGH || shouldRecharge) && (
            <Button
              onClick={() => {
                onClose();
              }}
              variant={'outline'}
            >
              {t('Cancel')}
            </Button>
          )}
          <Button
            ml={errorCode !== ResponseCode.BALANCE_NOT_ENOUGH || shouldRecharge ? '12px' : 0}
            isDisabled={isCheckingPayment}
            onClick={() => {
              if (shouldRecharge) {
                openCostCenterApp();
              }
              onClose();
            }}
          >
            {shouldRecharge ? t('add_credit') : t('confirm')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ErrorModal;
