import DeleteIcon from '@/components/Icons/DeleteIcon';
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
  IconButton,
  IconButtonProps
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
export default function DeleteSingleFileModal({
  onDelete,
  ...styles
}: IconButtonProps & { onDelete: () => void }) {
  const { onOpen, onClose, isOpen } = useDisclosure();
  const { t } = useTranslation('file');
  return (
    <>
      <IconButton
        icon={<DeleteIcon boxSize={'14px'} />}
        p="5px"
        {...styles}
        aria-label={'delete'}
        onClick={(e) => {
          onOpen();
          e.stopPropagation();
        }}
      />
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
          <ModalHeader p="0">{t('SingleDelete')}</ModalHeader>
          <ModalBody h="100%" w="100%" p="0" mt="22px" display={'flex'} flexDir={'column'}>
            <Text mb="12px">{t('confirmDeleteSingleFile')}</Text>
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
