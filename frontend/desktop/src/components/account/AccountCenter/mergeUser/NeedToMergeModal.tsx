import { useCustomToast } from '@/hooks/useCustomToast';
import {
  Text,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  ModalHeader,
  Spinner,
  ModalBody,
  BoxProps,
  VStack,
  HStack
} from '@chakra-ui/react';
import { WarnTriangeIcon } from '@sealos/ui';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { mergeUserRequest } from '@/api/auth';
import useCallbackStore, { MergeUserStatus } from '@/stores/callback';
import { useEffect, useState } from 'react';
import { USER_MERGE_STATUS } from '@/types/response/merge';
import { ValueOf } from '@/types';
import { I18nErrorKey } from '@/types/i18next';

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
        borderRadius={'12px'}
        maxW={'400px'}
        bgColor={'#FFF'}
        backdropFilter="blur(150px)"
        p="24px"
      >
        <ModalCloseButton right={'24px'} top="24px" p="0" />
        <ModalHeader
          bg={'grayModern.25'}
          borderBottomWidth={'1px'}
          borderBottomColor={'grayModern.100'}
          p="0"
          display={'flex'}
          gap={'10px'}
        >
          <WarnTriangeIcon boxSize={'24px'} fill={'yellow.500'} />
          <Text>{t('common:merge_account_title')}</Text>
        </ModalHeader>
        {mutation.isLoading ? (
          <Spinner mx="auto" />
        ) : (
          <ModalBody h="100%" w="100%" p="0" mt="22px" fontSize={'14px'}>
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
