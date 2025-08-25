import {
  Button,
  Flex,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  useDisclosure
} from '@chakra-ui/react';
import { formatMoney } from '@/utils/format';
import useOverviewStore from '@/stores/overview';
import { useTranslation } from 'next-i18next';
export default function useNotEnough() {
  const { isOpen, onOpen, onClose } = useDisclosure({
    defaultIsOpen: true
  });
  const { balance } = useOverviewStore((state) => state);
  const { t } = useTranslation();
  function handleConfirm(): void {
    onClose();
  }
  const NotEnoughModal = () => {
    return (
      <Modal isOpen={isOpen && balance < 0} onClose={onClose}>
        <ModalOverlay />
        <ModalContent w="400px">
          <ModalHeader>{t('Insufficient Balance')}</ModalHeader>
          <ModalCloseButton />
          <Flex
            pt="4px"
            mb="30px"
            mx={'24px'}
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
          >
            <Text color="#7B838B" fontWeight={'normal'}>
              {t('Balance')}：¥{formatMoney(balance)}, {t('Not Engough Balance')}
            </Text>
            <Flex w={'full'} justify={'flex-end'} fontWeight="500" mt={'20px'}>
              <Button
                size="primary"
                variant="unstyled"
                width="80px"
                height="36px"
                /* White/600 */
                background="#F4F6F8"
                /* Gray modern/200 */
                border="1px solid #DEE0E2"
                borderRadius="4px"
                mr="12px"
                fontWeight="500"
                /* Gray modern/600 */
                color="#5A646E"
                onClick={() => onClose()}
              >
                {t('Cancel')}
              </Button>
              <Button
                size="primary"
                variant="primary"
                width={'114px'}
                fontWeight="500"
                onClick={() => handleConfirm()}
              >
                {t('Charge')}
              </Button>
            </Flex>
          </Flex>
        </ModalContent>
      </Modal>
    );
  };

  return {
    NotEnoughModal
  };
}
