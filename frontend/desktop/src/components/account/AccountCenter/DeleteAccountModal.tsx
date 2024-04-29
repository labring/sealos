import { useCustomToast } from '@/hooks/useCustomToast';
import request from '@/services/request';
import useSessionStore from '@/stores/session';
import { ApiResp } from '@/types';
import { RESOURCE_STATUS } from '@/types/user';
import {
  ButtonProps,
  useDisclosure,
  Text,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  ModalHeader,
  Spinner,
  ModalBody,
  VStack,
  HStack,
  FormControl,
  Divider
} from '@chakra-ui/react';
import { InfoCircleIcon, WarnTriangeIcon } from '@sealos/ui';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingInput } from './SettingInput';
import { SettingInputGroup } from './SettingInputGroup';
import { useRouter } from 'next/router';
enum PageStatus {
  IDLE,
  REMAIN_OTHER_REGION_RESOURCE,
  REMAIN_WORKSPACE,
  REMAIN_RESOURCE,
  INSUFFICIENT_BALANCE
}
export default function DeleteAccount({ ...props }: ButtonProps) {
  const { onOpen, isOpen, onClose } = useDisclosure();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useCustomToast({ status: 'error' });
  const { delSession, setToken, session } = useSessionStore();
  const [pagestatus, setPagestatus] = useState(PageStatus.IDLE);
  const [nickname, setnickname] = useState('');
  const verifyWords = t('deleteMyAccount');
  const router = useRouter();
  const [verifyValue, setVerifyValue] = useState('');
  const mutation = useMutation({
    async mutationFn() {
      return await request('/api/auth/delete');
    },
    onSuccess() {
      delSession();
      queryClient.clear();
      setToken('');
      router.replace('/signin');
      setToken('');
    },
    onError(error) {
      const resp = error as ApiResp;
      if (!resp.message) {
        return toast({ title: (error as ApiResp).message });
      }
      if (
        [
          RESOURCE_STATUS.REMAIN_APP,
          RESOURCE_STATUS.REMAIN_DATABASE,
          RESOURCE_STATUS.REMAIN_OBJECT_STORAGE,
          RESOURCE_STATUS.REMAIN_TEMPLATE
        ].includes(resp.message as any)
      ) {
        return setPagestatus(PageStatus.REMAIN_RESOURCE);
      } else if (resp.message === RESOURCE_STATUS.REMAIN_OTHER_REGION_RESOURCE) {
        return setPagestatus(PageStatus.REMAIN_OTHER_REGION_RESOURCE);
      } else if (resp.message === RESOURCE_STATUS.INSUFFICENT_BALANCE) {
        return setPagestatus(PageStatus.INSUFFICIENT_BALANCE);
      } else if (resp.message === RESOURCE_STATUS.REMAIN_WORKSACE_OWNER) {
        return setPagestatus(PageStatus.REMAIN_WORKSPACE);
      } else {
        setPagestatus(PageStatus.IDLE);
        toast({ title: (error as ApiResp).message });
      }
    }
  });
  return (
    <>
      {
        <Button
          onClick={onOpen}
          variant={'ghost'}
          bgColor={'grayModern.150'}
          p={'8px 14px'}
          color={'red.600'}
          {...props}
        >
          {t('Delete Account Button')}
        </Button>
      }
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent
          borderRadius={'4px'}
          maxW={'400px'}
          bgColor={'#FFF'}
          backdropFilter="blur(150px)"
          p="24px"
        >
          <ModalCloseButton right={'24px'} top="24px" p="0" />
          <ModalHeader bg={'white'} border={'none'} p="0" display={'flex'} gap={'10px'}>
            <WarnTriangeIcon boxSize={'24px'} fill={'yellow.500'} />
            <Text>{t('Delete Account Title')}</Text>
          </ModalHeader>
          {mutation.isLoading ? (
            <Spinner mx="auto" />
          ) : (
            <ModalBody h="100%" w="100%" p="0" mt="22px" fontSize={'14px'}>
              {pagestatus === PageStatus.IDLE ? (
                <VStack alignItems={'stretch'} gap={'0'}>
                  <Text mb={'12px'}>{t('DeleteAccountTitle')}</Text>
                  <HStack
                    color={'red.500'}
                    bgColor={'red.50'}
                    p={'6px 12px'}
                    borderRadius={'6px'}
                    gap={'4px'}
                  >
                    <InfoCircleIcon boxSize={'14px'}></InfoCircleIcon>
                    <Text fontSize={'11px'}>{t('IrreversibleActionTips')}</Text>
                  </HStack>
                  <Divider h={'1px'} bgColor={'grayModern.200'} my={'24px'} />
                  <FormControl isInvalid={nickname !== session?.user.name} mb={'12px'}>
                    <HStack fontWeight={400} mb={'10px'}>
                      <Text>{t('Enter')}</Text>
                      <Text fontWeight={500}>{session?.user.name}</Text>
                      <Text>{t('Confirm')}</Text>
                    </HStack>
                    <SettingInputGroup>
                      <SettingInput
                        type="text"
                        value={nickname}
                        onChange={(e) => {
                          setnickname(e.target.value);
                        }}
                      />
                    </SettingInputGroup>
                  </FormControl>
                  <FormControl isInvalid={verifyValue !== verifyWords}>
                    <HStack mb={'12px'}>
                      <Text>{t('Enter')}</Text>
                      <Text fontWeight={500}>{verifyWords}</Text>
                      <Text>{t('Confirm')}</Text>
                    </HStack>
                    <SettingInputGroup>
                      <SettingInput
                        type="text"
                        value={verifyValue}
                        onChange={(e) => {
                          setVerifyValue(e.target.value);
                        }}
                      />
                    </SettingInputGroup>
                  </FormControl>
                  <HStack gap={'12px'} justifyContent={'flex-end'} mt={'24px'}>
                    <Button
                      onClick={onClose}
                      variant={'unstyled'}
                      border={'1px'}
                      borderColor={'grayModern.250'}
                      p={'8px 14px'}
                      color={'grayModern.600'}
                      {...props}
                    >
                      {t('Cancel')}
                    </Button>
                    <Button
                      onClick={() => {
                        mutation.mutate();
                      }}
                      variant={'unstyled'}
                      bgColor={'red.600'}
                      p={'8px 14px'}
                      color={'white'}
                      {...props}
                    >
                      {t('Delete Account Button')}
                    </Button>
                  </HStack>
                </VStack>
              ) : (
                <VStack alignItems={'stretch'} gap={'0'}>
                  {pagestatus === PageStatus.INSUFFICIENT_BALANCE ? (
                    <Text>{t('INSUFFICIENT_BALANCE_tips')}</Text>
                  ) : pagestatus === PageStatus.REMAIN_RESOURCE ? (
                    <Text>{t('Remain Resource Tips')}</Text>
                  ) : pagestatus === PageStatus.REMAIN_WORKSPACE ? (
                    <Text>{t('Remain Workspace Tips')}</Text>
                  ) : pagestatus === PageStatus.REMAIN_OTHER_REGION_RESOURCE ? (
                    <Text>{t('Remain Other Region Resource Tips')}</Text>
                  ) : null}
                  <HStack
                    color={'red.500'}
                    bgColor={'red.50'}
                    p={'6px 12px'}
                    borderRadius={'6px'}
                    gap={'4px'}
                    mt="12px"
                  >
                    <InfoCircleIcon boxSize={'14px'}></InfoCircleIcon>
                    {(pagestatus === PageStatus.REMAIN_RESOURCE ||
                      pagestatus === PageStatus.REMAIN_WORKSPACE ||
                      pagestatus === PageStatus.REMAIN_OTHER_REGION_RESOURCE) && (
                      <Text fontSize={'11px'}>{t('Delete Account Caution')}</Text>
                    )}
                  </HStack>
                  <HStack gap={'12px'} justifyContent={'flex-end'} mt={'24px'}>
                    <Button
                      onClick={onClose}
                      variant={'unstyled'}
                      border={'1px'}
                      borderColor={'grayModern.250'}
                      p={'8px 14px'}
                      color={'grayModern.600'}
                      {...props}
                    >
                      {t('Cancel')}
                    </Button>
                    <Button onClick={onClose} variant={'primary'} {...props}>
                      {t('Confirm')}
                    </Button>
                  </HStack>
                </VStack>
              )}
            </ModalBody>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
