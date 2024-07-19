import {
  Button,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  useDisclosure,
  Text,
  Spinner,
  Flex
} from '@chakra-ui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InvitedStatus } from '@/types/team';
import useSessionStore from '@/stores/session';
import { CancelIcon, DeleteIcon } from '@sealos/ui';
import { removeMemberRequest } from '@/api/namespace';
import { useCustomToast } from '@/hooks/useCustomToast';
import { ApiResp } from '@/types';
import { useTranslation } from 'next-i18next';

export default function RemoveMember({
  ns_uid,
  status,
  k8s_username: tK8s_username,
  targetUserCrUid,
  ...props
}: {
  targetUserCrUid: string;
  ns_uid: string;
  k8s_username: string;
  status: InvitedStatus;
} & Parameters<typeof Button>[0]) {
  const { onOpen, isOpen, onClose } = useDisclosure();
  const session = useSessionStore((s) => s.session);
  const selfUserCrUid = session?.user.userCrUid;
  const queryClient = useQueryClient();

  const { toast } = useCustomToast({ status: 'error' });
  const mutation = useMutation({
    mutationFn: removeMemberRequest,
    onSuccess() {
      queryClient.invalidateQueries();
      onClose();
    },
    onError(error) {
      toast({ title: (error as ApiResp).message });
    }
  });
  const submit = () => {
    mutation.mutate({ ns_uid, targetUserCrUid });
  };
  const { t, i18n } = useTranslation();
  const removeKey =
    status === InvitedStatus.Inviting
      ? t('common:cancel')
      : selfUserCrUid === targetUserCrUid
      ? t('common:quit')
      : t('common:remove');
  const removeTips =
    selfUserCrUid === targetUserCrUid
      ? t('common:quit_workspace_tips')
      : t('common:remove_member_tips');
  return (
    <>
      <Button
        onClick={onOpen}
        variant={'unstyled'}
        fontSize={'12px'}
        fontWeight={'500'}
        h="auto"
        py="7px"
        display={'flex'}
        alignItems={'center'}
        {...props}
      >
        {status === InvitedStatus.Inviting ? (
          <CancelIcon boxSize="16px" mr="4px" />
        ) : (
          <DeleteIcon boxSize="16px" mr="4px" />
        )}
        <Text fontSize={'12px'}>{removeKey}</Text>
      </Button>
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent
          borderRadius={'4px'}
          maxW={'380px'}
          bgColor={'#FFF'}
          backdropFilter="blur(150px)"
          p="24px"
        >
          <ModalCloseButton right={'24px'} top="16px" p="0" />
          <ModalHeader bg={'white'} border={'none'} p="0">
            {t('common:warning')}
          </ModalHeader>
          {mutation.isLoading ? (
            <Spinner mx="auto" />
          ) : (
            <ModalBody h="100%" w="100%" p="0" mt="22px">
              <Text>{removeTips}</Text>
              <Flex mt="37px" justify={'flex-end'} gap={'12px'}>
                <Button
                  variant={'unstyled'}
                  py="6px"
                  px="16px"
                  color={'#5A646E'}
                  borderRadius="4px"
                  border="1px solid #DEE0E2"
                  background="#F4F6F8"
                  _hover={{
                    opacity: '0.8'
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    onClose();
                  }}
                >
                  {t('common:cancel')}
                </Button>
                <Button
                  variant={'unstyled'}
                  bg="#FF5B6E"
                  borderRadius={'4px'}
                  color="#fff"
                  py="6px"
                  px="16px"
                  _hover={{
                    opacity: '0.8'
                  }}
                  mt="0"
                  onClick={(e) => {
                    e.preventDefault();
                    submit();
                  }}
                >
                  {t('common:confirm')}
                </Button>
              </Flex>
            </ModalBody>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
