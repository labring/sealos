import { mergeUserRequest } from '@/api/auth';
import useCallbackStore, { MergeUserStatus } from '@/stores/callback';
import { useConfigStore } from '@/stores/config';
import type { ApiResp } from '@/types';
import type { I18nErrorKey } from '@/types/i18next';
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useRef, useState } from 'react';

function NeedToMerge() {
  const { mergeUserStatus, mergeUserData, setMergeUserStatus, setMergeUserData } =
    useCallbackStore();
  const accountMergeEnabled = useConfigStore((s) => s.commonConfig?.accountMergeEnabled === true);
  const [mergeError, setMergeError] = useState('');
  const cancelRef = useRef<HTMLButtonElement>(null);
  const submittingRef = useRef(false);
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isOpen = [MergeUserStatus.CONFLICT, MergeUserStatus.CANMERGE].includes(mergeUserStatus);
  const canMerge =
    accountMergeEnabled &&
    mergeUserStatus === MergeUserStatus.CANMERGE &&
    !!mergeUserData?.code &&
    !!mergeUserData?.providerType;

  const mutation = useMutation({
    mutationFn: mergeUserRequest,
    onSuccess() {
      queryClient.invalidateQueries();
      setMergeError('');
      setMergeUserData();
      setMergeUserStatus(MergeUserStatus.IDLE);
    },
    onError(error: ApiResp) {
      if (error.message === 'invalid code') {
        setMergeUserData();
        setMergeError(t('common:verification_code_expired'));
      } else {
        setMergeError(
          t((error.message || 'INTERNAL_SERVER_ERROR') as I18nErrorKey, {
            ns: 'error',
            defaultValue: error.message || t('error:INTERNAL_SERVER_ERROR')
          })
        );
      }
    },
    onSettled() {
      submittingRef.current = false;
    }
  });

  const onClose = () => {
    if (submittingRef.current) return;
    setMergeError('');
    setMergeUserData();
    setMergeUserStatus(MergeUserStatus.IDLE);
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} initialFocusRef={cancelRef} isCentered>
      <ModalOverlay />
      <ModalContent
        role={canMerge ? 'alertdialog' : 'dialog'}
        borderRadius={'10px'}
        maxW={'400px'}
        bgColor={'#FFF'}
        backdropFilter="blur(150px)"
      >
        <ModalCloseButton top={'8px'} right={'20px'} isDisabled={mutation.isLoading} />
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
            <Text mb={'12px'}>
              {t(
                canMerge
                  ? 'common:merge_account_tips2'
                  : accountMergeEnabled && mergeUserStatus === MergeUserStatus.CONFLICT
                  ? 'common:merge_account_tips1'
                  : 'common:account_already_bound'
              )}
            </Text>
            {mergeError && <Text role="alert">{mergeError}</Text>}
            <HStack gap={'12px'} justifyContent={'flex-end'} mt={'24px'}>
              <Button
                ref={cancelRef}
                onClick={onClose}
                isDisabled={mutation.isLoading}
                variant={'unstyled'}
                border={'1px'}
                borderColor={'grayModern.250'}
                p={'8px 19px'}
                fontSize={'12px'}
                fontWeight={'500'}
                color={'grayModern.600'}
              >
                {t(canMerge ? 'common:cancel' : 'common:confirm')}
              </Button>
              {canMerge && (
                <Button
                  onClick={() => {
                    if (!canMerge || !mergeUserData || submittingRef.current) return;
                    submittingRef.current = true;
                    setMergeError('');
                    mutation.mutate(mergeUserData);
                  }}
                  isLoading={mutation.isLoading}
                  bgColor={'grayModern.900'}
                  color={'white'}
                  fontSize={'12px'}
                  fontWeight={'500'}
                  p={'8px 19px'}
                >
                  {t('common:merge')}
                </Button>
              )}
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
export default NeedToMerge;
