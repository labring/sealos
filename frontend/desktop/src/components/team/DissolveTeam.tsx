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
import { useTranslation } from 'next-i18next';
import { DeleteIcon } from '@sealos/ui';
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
    if (teamName.trim() !== nsid)
      return toast({
        title: t('common:invaild_name_of_team')
      });
    mutation.mutate({ ns_uid });
  };

  return (
    <>
      <Button
        size={'sm'}
        height={'32px'}
        variant={'outline'}
        _hover={{
          color: 'red.600',
          bg: 'rgba(17, 24, 36, 0.05)'
        }}
        {...props}
        leftIcon={<DeleteIcon boxSize={'14px'} />}
        onClick={() => {
          if (session?.user?.ns_uid === ns_uid) {
            return toast({
              title: t('common:invaild_context')
            });
          }
          onOpen();
        }}
      >
        {t('common:dissolve_team')}
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
            Warning
          </ModalHeader>
          {mutation.isLoading ? (
            <Spinner mx="auto" />
          ) : (
            <ModalBody h="100%" w="100%" p="0" mt="22px">
              <Text>{t('common:dissovle_tips')}</Text>
              <Text>{t(`common:enter_confirm`, { value: nsid })}</Text>
              <CustomInput
                onChange={(e) => {
                  e.preventDefault();
                  setTeamName(e.target.value);
                }}
                placeholder={t('common:name_of_team') || ''}
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
                {t('common:confirm')}
              </Button>
            </ModalBody>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
