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
  ButtonProps
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import ListCheckIcon from '@/components/Icons/ListCheckIcon';
export default function DeleteFileModal({
  onDelete,
  fileListLength,
  ...styles
}: ButtonProps & { onDelete: () => void; fileListLength: number }) {
  const { onOpen, onClose, isOpen } = useDisclosure();
  const { t } = useTranslation('file');
  return (
    <>
      <Button {...styles} onClick={onOpen} isDisabled={fileListLength === 0}>
        <ListCheckIcon boxSize={'24px'} color="grayModern.500" />{' '}
        <Text color={'grayModern.900'} display={['none', null, null, null, 'initial']}>
          {t('bulkDelete')}(
          {t('selectedItems', {
            count: fileListLength
          })}
          )
        </Text>
      </Button>
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent
          borderRadius={'4px'}
          maxW={'560px'}
          bgColor={'#FFF'}
          backdropFilter="blur(150px)"
          p="24px"
        >
          <ModalCloseButton right={'24px'} top="24px" p="0" />
          <ModalHeader p="0">{t('bulkDelete')}</ModalHeader>
          <ModalBody h="100%" w="100%" p="0" mt="22px" display={'flex'} flexDir={'column'}>
            <Text mb="12px">{t('confirmDeleteFile')}</Text>
            <Button
              variant={'primary'}
              alignSelf={'self-end'}
              px="43px"
              py="8px"
              onClick={() => {
                onDelete();
                onClose();
              }}
            >
              {t('confirm')}
            </Button>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
