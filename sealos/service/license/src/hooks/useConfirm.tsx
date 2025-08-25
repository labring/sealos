import {
  Button,
  Center,
  Flex,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Text,
  useDisclosure
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useCallback, useRef } from 'react';

export const useConfirm = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { t } = useTranslation();
  const confirmCb = useRef<any>();
  const cancelCb = useRef<any>();

  return {
    openConfirm: useCallback(
      (confirm?: any, cancel?: any) => {
        return function () {
          onOpen();
          confirmCb.current = confirm;
          cancelCb.current = cancel;
        };
      },
      [onOpen]
    ),
    ConfirmChild: useCallback(
      () => (
        <Modal isOpen={isOpen} onClose={onClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalCloseButton />
            <Flex
              flexDirection={'column'}
              px="37px"
              pt="90px"
              pb="42px"
              alignItems={'center'}
              justifyContent={'center'}
            >
              <Text color={'#24282C'} fontWeight={500} fontSize={'24px'}>
                将为您新建一个标准版集群
              </Text>
              <Text mt="28px" fontSize={'14px'} fontWeight={400} color={'#7B838B'}>
                点击立即开始后将会新建一个集群
              </Text>
              <Button
                mt="62px"
                w="218px"
                h="44px"
                variant={'black'}
                onClick={() => {
                  onClose();
                  typeof confirmCb.current === 'function' && confirmCb.current();
                }}
              >
                立即开始
              </Button>
              <Center
                mt="16px"
                w="218px"
                h="20px"
                bg={'white'}
                color={'#7B838B'}
                fontSize={'14px'}
                fontWeight={400}
                cursor={'pointer'}
                onClick={() => {
                  onClose();
                  typeof cancelCb.current === 'function' && cancelCb.current();
                }}
              >
                已有集群
              </Center>
            </Flex>
          </ModalContent>
        </Modal>
      ),
      [isOpen, onClose]
    )
  };
};
