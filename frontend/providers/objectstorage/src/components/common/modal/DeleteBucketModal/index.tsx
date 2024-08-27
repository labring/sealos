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
import { WarnTriangeIcon } from '@sealos/ui';
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
          fill={'grayModern.600'}
          color={'grayModern.600'}
          onClick={() => {
            onOpen();
          }}
        >
          <DeleteIcon boxSize={'16px'} fill={'inherit'} />
          <Text color={'inherit'}>{t('delete')}</Text>
        </Button>
      ) : (
        <Flex
          px="4px"
          py="6px"
          onClick={() => {
            onOpen();
          }}
          w="full"
          align={'center'}
        >
          <DeleteIcon w="16px" h="16px" color={'grayModern.600'} mr="8px" />
          <Text color={'grayModern.600'}>{t('delete')}</Text>
        </Flex>
      )}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent maxW={'400px'} bgColor={'#FFF'} backdropFilter="blur(150px)">
          <ModalCloseButton />
          <ModalHeader display={'flex'} alignItems={'center'}>
            <WarnTriangeIcon
              color={'yellow.500'}
              boxSize={'20px'}
              mr={'10px'}
              fill={'yellow.500'}
            />
            <Text>{t('deleteWarning')}</Text>
          </ModalHeader>
          <ModalBody h="100%" w="100%" display={'flex'} flexDir={'column'}>
            <Text mb="12px">{t('bucket:confirmDeleteBucket')}</Text>
            <Text mb="12px">{t('bucket:enterBucketNameConfirmation', { bucketName })}</Text>
            <Input
              mb="24px"
              type="text"
              variant={'outline'}
              width={'full'}
              placeholder={t('bucket:bucketName')}
              value={inputVal}
              onChange={(v) => setInputVal(v.target.value.trim())}
            />
            <Flex justifyContent={'flex-end'} gap={'12px'}>
              <Button
                variant={'outline'}
                px="19.5px"
                py="8px"
                fontSize={'12px'}
                fontWeight={'500'}
                height={'auto'}
                onClick={onClose}
              >
                {t('cancel')}
              </Button>
              <Button
                variant={'warningConfirm'}
                {...styles}
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
            </Flex>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
