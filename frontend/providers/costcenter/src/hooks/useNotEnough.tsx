
import {
  Button,
  Flex,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import { formatMoney } from '@/utils/format';
import useOverviewStore from '@/stores/overview';
export default function useNotEnough() {
  const { isOpen, onOpen, onClose } = useDisclosure({
    defaultIsOpen: true
  });
  const { balance } = useOverviewStore(state => state)
  const _openRecharge = useOverviewStore(state => state.setRecharge)
  const openRecharge = () => _openRecharge(true)
  function handleConfirm(): void {
    onClose()
    openRecharge()
  }
  const NotEnoughModal = () => {
    return (
      <Modal isOpen={isOpen && balance < 0} onClose={onClose}>
        <ModalOverlay />
        <ModalContent w="400px" h={'180px'}>
          <ModalHeader>余额不足</ModalHeader>
          <ModalCloseButton />
          <Flex
            pt="4px"
            mb="36px"
            mx={'24px'}
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
          >
            <Text color="#7B838B" fontWeight={'normal'}>
              您的账户余额：¥{formatMoney(balance)}, 余额不足，请立即充值
            </Text>
            <Flex
              w={'full'}
              justify={'flex-end'}
              fontWeight='500'
            >
              <Button
                size="primary"
                variant="unstyled"
                mt="12px"
                width='80px'
                height='36px'

                /* White/600 */
                background='#F4F6F8'

                /* Gray modern/200 */
                border='1px solid #DEE0E2'
                borderRadius='4px'
                mr='12px'
                fontWeight='500'
                /* Gray modern/600 */
                color='#5A646E'


                onClick={() => onClose()}
              >
                取消
              </Button>
              <Button
                size="primary"
                variant="primary"
                mt="12px"
                width={'114px'}
                fontWeight='500'
                onClick={() => handleConfirm()}
              >
                立刻充值
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
