import useCallbackStore, { MergeUserStatus } from '@/stores/callback';
import {
  Button,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack
} from '@chakra-ui/react';
import { WarnTriangeIcon } from '@sealos/ui';
import { useTranslation } from 'next-i18next';
import { useEffect, useState } from 'react';

function NeedToMerge() {
  const { mergeUserStatus, setMergeUserStatus, setMergeUserData } = useCallbackStore();
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    setIsOpen([MergeUserStatus.CONFLICT, MergeUserStatus.CANMERGE].includes(mergeUserStatus));
  }, [mergeUserStatus]);

  const onClose = () => {
    setMergeUserData();
    setMergeUserStatus(MergeUserStatus.IDLE);
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent
        borderRadius={'10px'}
        maxW={'400px'}
        bgColor={'#FFF'}
        backdropFilter="blur(150px)"
      >
        <ModalCloseButton top={'8px'} right={'20px'} />
        <ModalHeader
          px={'20px'}
          py={'12px'}
          bg={'grayModern.25'}
          borderBottom={'1px solid'}
          fontWeight={500}
          fontSize={'16px'}
          display={'flex'}
          gap={'10px'}
          borderColor={'grayModern.100'}
        >
          <WarnTriangeIcon boxSize={'24px'} fill={'yellow.500'} />
          <Text>{t('common:merge_account_title')}</Text>
        </ModalHeader>
        <ModalBody h="100%" w="100%" px="36px" pt="24px" pb="32px" fontSize={'14px'}>
          <VStack alignItems={'stretch'} gap={'0'}>
            <Text mb={'12px'}>{t('common:account_already_bound')}</Text>
            <HStack gap={'12px'} justifyContent={'flex-end'} mt={'24px'}>
              <Button
                onClick={onClose}
                variant={'unstyled'}
                border={'1px'}
                borderColor={'grayModern.250'}
                p={'8px 19px'}
                fontSize={'12px'}
                fontWeight={'500'}
                color={'grayModern.600'}
              >
                {t('common:confirm')}
              </Button>
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
export default NeedToMerge;
