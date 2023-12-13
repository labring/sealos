import { deleteBucket } from '@/api/bucket';
import DeleteIcon from '@/components/Icons/DeleteIcon';
import { QueryKey } from '@/consts';
import { useToast } from '@/hooks/useToast';
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
  Input,
  Flex
} from '@chakra-ui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
export default function DeleteBucketModal({
  bucketName,
  layout = 'md',
  ...styles
}: ButtonProps & { bucketName: string; layout?: 'md' | 'sm' }) {
  const { onOpen, onClose, isOpen } = useDisclosure();
  const { toast } = useToast();
  const { t } = useTranslation(['common', 'bucket', 'file']);
  const [inputVal, setInputVal] = useState('');
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: deleteBucket,
    onSuccess() {
      queryClient.invalidateQueries([QueryKey.bucketList]);
    }
  });
  return (
    <>
      {layout === 'md' ? (
        <Button
          gap="8px"
          px="24px"
          py="10px"
          {...styles}
          onClick={() => {
            onOpen();
          }}
        >
          <DeleteIcon boxSize={'16px'} color="grayModern.400" />
          <Text>{t('delete')}</Text>
        </Button>
      ) : (
        <Flex
          px="4px"
          py="6px"
          onClick={() => {
            onOpen();
          }}
          w="full"
        >
          <DeleteIcon w="16px" h="16px" color={'grayModern.600'} mr="8px" />
          <Text color={'grayModern.700'}>{t('delete')}</Text>
        </Flex>
      )}
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
          <ModalHeader p="0">{t('deleteWarning')}</ModalHeader>
          <ModalBody h="100%" w="100%" p="0" mt="22px" display={'flex'} flexDir={'column'}>
            <Text mb="12px">{t('bucket:confirmDeleteBucket')}</Text>
            <Text mb="12px">{t('bucket:enterBucketNameConfirmation', { bucketName })}</Text>
            <Input
              mb="20px"
              type="text"
              variant={'secondary'}
              placeholder={t('bucket:bucketName')}
              value={inputVal}
              onChange={(v) => setInputVal(v.target.value.trim())}
            />
            <Button
              variant={'primary'}
              alignSelf={'self-end'}
              px="43px"
              py="8px"
              onClick={() => {
                if (inputVal !== bucketName) {
                  toast({
                    title: t('bucket:enterValidBucketName'),
                    status: 'error'
                  });
                  return;
                }
                mutation.mutate({
                  bucketName
                });
                onClose();
              }}
            >
              {t('file:confirm')}
            </Button>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
