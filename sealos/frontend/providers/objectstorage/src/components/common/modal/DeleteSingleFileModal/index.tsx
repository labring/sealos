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
  IconButtonProps,
  Flex
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
        <ModalContent maxW={'400px'} bgColor={'#FFF'} backdropFilter="blur(150px)">
          <ModalCloseButton />
          <ModalHeader>{t('SingleDelete')}</ModalHeader>
          <ModalBody h="100%" w="100" display={'flex'} flexDir={'column'}>
            <Text mb="12px">{t('confirmDeleteSingleFile')}</Text>
            <Flex py={'16px'} justifyContent={'flex-end'} gap={'12px'}>
              <Button
                variant={'secondary'}
                px="19.5px"
                py="8px"
                fontSize={'12px'}
                fontWeight={'500'}
                borderRadius={'4px'}
                height={'auto'}
                borderColor={'grayModern.250'}
                onClick={() => onClose()}
              >
                {t('cancel', {
                  ns: 'common'
                })}
              </Button>
              <Button
                variant={'warningConfirm'}
                {...styles}
                onClick={() => {
                  onDelete();
                  onClose();
                }}
              >
                {t('confirm')}
              </Button>
            </Flex>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
