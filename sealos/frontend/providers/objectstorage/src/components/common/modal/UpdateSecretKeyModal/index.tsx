import { deleteBucket, updateSecret } from '@/api/bucket';
import RefreshIcon from '@/components/Icons/RefreshIcon';
import { QueryKey } from '@/consts';
import { useToast } from '@/hooks/useToast';
import { useOssStore } from '@/store/ossStore';
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
import { WarnTriangeIcon } from '@sealos/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { title } from 'process';
import { useState } from 'react';
export default function UpdateSecretKeyModal({ ...styles }: ButtonProps & {}) {
  const { onOpen, onClose, isOpen } = useDisclosure();
  const { t } = useTranslation(['common', 'bucket', 'file']);
  const queryClient = useQueryClient();
  const { isUpdating, setIsUpdating, clearClient } = useOssStore();
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: updateSecret,
    onSuccess() {
      queryClient.invalidateQueries([QueryKey.bucketUser]);
      clearClient();
      setIsUpdating(true);
    },
    onError(err) {
      toast({
        status: 'error',
        title: t('reset_error', { ns: 'common' })
      });
    }
  });
  return (
    <>
      <Button
        gap="4px"
        variant={'outline'}
        px="8px"
        py="4px"
        h="auto"
        fontSize={'11px'}
        fontWeight={'500'}
        borderRadius={'4px'}
        isLoading={isUpdating}
        _loading={{
          boxSize: '20px'
        }}
        {...styles}
        onClick={() => {
          onOpen();
        }}
      >
        <RefreshIcon boxSize={'12px'} color="grayModern.400" />
        <Text>{t('reset')}</Text>
      </Button>
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent maxW={'360px'} bgColor={'#FFF'} backdropFilter="blur(150px)">
          <ModalCloseButton />
          <ModalHeader display={'flex'} alignItems={'center'}>
            <WarnTriangeIcon
              color={'yellow.500'}
              boxSize={'20px'}
              mr={'10px'}
              fill={'yellow.500'}
            />
            <Text>{t('bucket:reset_user_sk_title')}</Text>
          </ModalHeader>
          <ModalBody
            display={'flex'}
            py={'24px'}
            px={'16px'}
            justifyContent={'flex-end'}
            gap={'12px'}
          >
            <Button
              variant={'outline'}
              px="19.5px"
              py="8px"
              fontSize={'12px'}
              fontWeight={'500'}
              height={'auto'}
              borderColor={'grayModern.250'}
              onClick={() => onClose()}
            >
              {t('cancel')}
            </Button>
            <Button
              variant={'warningConfirm'}
              {...styles}
              onClick={() => {
                mutation.mutate();
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
