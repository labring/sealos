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
  ButtonProps
} from '@chakra-ui/react';
import CustomInput from './Input';
import { useState } from 'react';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteTeamRequest } from '@/api/namespace';
import useSessionStore from '@/stores/session';
import { ApiResp } from '@/types';
import { useTranslation } from 'react-i18next';
export default function DissolveTeam({
  nsid,
  ns_uid,
  onSuccess,
  ...props
}: {
  nsid: string;
  ns_uid: string;
  onSuccess?: (ns_uid: string) => void;
} & ButtonProps) {
  const { onOpen, isOpen, onClose } = useDisclosure();
  const [teamName, setTeamName] = useState('');
  const { toast } = useCustomToast({ status: 'error' });
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: deleteTeamRequest,
    onSuccess() {
      setTeamName('');
      queryClient.invalidateQueries({
        queryKey: ['teamList'],
        exact: false
      });
      onSuccess && onSuccess(ns_uid);
      onClose();
    },
    onError(error) {
      toast({ title: (error as ApiResp).message });
    }
  });
  const session = useSessionStore((s) => s.session);
  const { t } = useTranslation();
  const submit = () => {
    if (teamName !== nsid)
      return toast({
        title: t('Invaild Name of Team')
      });
    mutation.mutate({ ns_uid });
  };
  const { i18n } = useTranslation();

  return (
    <>
      <Button
        onClick={() => {
          if (session.user.ns_uid === ns_uid) {
            return toast({
              title: t('Invaild Context')
            });
          }
          onOpen();
        }}
        borderRadius="4px"
        border="1px solid #DEE0E2"
        background="#F4F6F8"
        fontSize={'12px'}
        fontWeight={'500'}
        h="auto"
        py="7px"
        px="16px"
        {...props}
      >
        <Image
          src="/images/material-symbols_delete-outline-rounded.svg"
          h="16px"
          w="16px"
          mr="4px"
        />
        {t('Dissolve Team')}
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
          <ModalCloseButton right={'24px'} top="24px" p="0" />
          <ModalHeader p="0">Warning</ModalHeader>
          {mutation.isLoading ? (
            <Spinner mx="auto" />
          ) : (
            <ModalBody h="100%" w="100%" p="0" mt="22px">
              {i18n.language === 'zh' ? (
                <>
                  <Text>确认要解散这个团队吗？ 如果执行此操作，将删除该团队的所有数据。</Text>
                  <Text>{`请输入"${nsid}"确认`}</Text>
                </>
              ) : (
                <>
                  <Text>
                    Are you sure you want to dissolve this team? If you proceed with this action,
                    all data associated with this project will be deleted.
                  </Text>
                  <Text>{`Please enter "${nsid}" to confirm.`}</Text>
                </>
              )}
              <CustomInput
                onChange={(e) => {
                  e.preventDefault();
                  setTeamName(e.target.value);
                }}
                placeholder={t('Name of Team') || ''}
                value={teamName}
              />
              <Button
                w="100%"
                variant={'unstyled'}
                bg="#24282C"
                borderRadius={'4px'}
                color="#fff"
                py="6px"
                px="12px"
                mt="24px"
                _hover={{
                  opacity: '0.8'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                {t('Confirm')}
              </Button>
            </ModalBody>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
