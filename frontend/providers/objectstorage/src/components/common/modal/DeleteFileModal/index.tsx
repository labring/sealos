import {
  Text,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  useDisclosure,
  Button,
  ButtonProps,
  Flex
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import ListCheckIcon from '@/components/Icons/ListCheckIcon';
export default function DeleteFileModal({
  onDelete,
  fileListLength,
  ...styles
}: ButtonProps & { onDelete: () => void; fileListLength: number }) {
  const { onOpen, onClose, isOpen } = useDisclosure();
  const { t } = useTranslation(['file', 'common']);
  return (
    <>
      <Button {...styles} onClick={onOpen} isDisabled={fileListLength === 0}>
        <ListCheckIcon boxSize={'24px'} color="grayModern.500" />{' '}
        <Text color={'grayModern.900'} display={['none', null, null, null, 'initial']}>
          {t('file:bulkDelete')}(
          {t('file:selectedItems', {
            count: fileListLength
          })}
          )
        </Text>
      </Button>
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent maxW={'400px'} bgColor={'#FFF'} backdropFilter="blur(150px)">
          <ModalCloseButton />
          <ModalHeader>{t('file:bulkDelete')}</ModalHeader>
          <ModalBody h="100%" w="100%" display={'flex'} flexDir={'column'}>
            <Text mb="12px">{t('file:confirmDeleteFile')}</Text>
            <Flex py={'16px'} justifyContent={'flex-end'} gap={'12px'}>
              <Button
                variant={'outline'}
                px="19.5px"
                py="8px"
                fontSize={'12px'}
                fontWeight={'500'}
                height={'auto'}
                onClick={() => onClose()}
              >
                {t('common:cancel')}
              </Button>
              <Button
                variant={'warningConfirm'}
                {...styles}
                onClick={() => {
                  onDelete();
                  onClose();
                }}
              >
                {t('file:confirm')}
              </Button>
            </Flex>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
