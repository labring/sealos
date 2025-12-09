import { mergeUserRequest } from '@/api/auth';
import { useCustomToast } from '@/hooks/useCustomToast';
import useCallbackStore, { MergeUserStatus } from '@/stores/callback';
import { ValueOf } from '@/types';
import { I18nErrorKey } from '@/types/i18next';
import { USER_MERGE_STATUS } from '@/types/response/merge';
import {
  BoxProps,
  Button,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
  VStack
} from '@chakra-ui/react';
import { WarnTriangeIcon } from '@sealos/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useEffect, useState } from 'react';

function NeedToMerge({ ...props }: BoxProps & {}) {
  const { mergeUserStatus, mergeUserData, setMergeUserStatus, setMergeUserData } =
    useCallbackStore();
  const [isOpen, setIsOpen] = useState(false);

  const onClose = () => {
    setMergeUserStatus(MergeUserStatus.IDLE);
  };

  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useCustomToast({ status: 'error' });
  const mutation = useMutation({
    mutationFn: mergeUserRequest,
    onSuccess() {
      queryClient.clear();
    },
    onError(err: { message: ValueOf<USER_MERGE_STATUS> }) {
      const errMessage =
        err.message === USER_MERGE_STATUS.INSUFFICENT_BALANCE
          ? err.message
          : 'MERGET_USER_INSUFFICENT_BALANCE';

      toast({
        status: 'error',
        title: t(err.message as I18nErrorKey, { ns: 'error' })
      });
    },
    onSettled() {
      setMergeUserData();
      setMergeUserStatus(MergeUserStatus.IDLE);
    }
  });
  useEffect(() => {
    setIsOpen(!![MergeUserStatus.CONFLICT, MergeUserStatus.CANMERGE].includes(mergeUserStatus));
  }, [mergeUserStatus]);
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
        {mutation.isLoading ? (
          <Spinner mx="auto" />
        ) : (
          <ModalBody h="100%" w="100%" px="36px" pt="24px" pb="32px" fontSize={'14px'}>
            <VStack alignItems={'stretch'} gap={'0'}>
              <Text mb={'12px'}>
                {mergeUserStatus === MergeUserStatus.CONFLICT
                  ? t('common:merge_account_tips1')
                  : t('common:merge_account_tips2')}
              </Text>
              {mergeUserStatus === MergeUserStatus.CONFLICT ? (
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
              ) : (
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
                    {t('common:cancel')}
                  </Button>
                  <Button
                    onClick={() => {
                      if (!mergeUserData)
                        return toast({
                          status: 'error',
                          title: 'Unknow Error'
                        });
                      mutation.mutate(mergeUserData);
                    }}
                    variant={'unstyled'}
                    bgColor={'grayModern.900'}
                    fontSize={'12px'}
                    fontWeight={'500'}
                    p={'8px 19px'}
                    color={'white'}
                  >
                    {t('common:merge')}
                  </Button>
                </HStack>
              )}
            </VStack>
          </ModalBody>
        )}
      </ModalContent>
    </Modal>
  );
}
export default NeedToMerge;
