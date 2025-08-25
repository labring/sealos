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
import { useState, useEffect } from 'react';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { renameRequest } from '@/api/namespace';
import { ApiResp } from '@/types';
import { useTranslation } from 'next-i18next';
import { EditIcon } from '@sealos/ui';

export default function RenameTeam({
  ns_uid,
  defaultTeamName,
  ...props
}: {
  ns_uid: string;
  defaultTeamName: string;
} & ButtonProps) {
  console.log(defaultTeamName);
  const { onOpen, isOpen, onClose } = useDisclosure();
  const [teamName, setTeamName] = useState(defaultTeamName);
  const { toast } = useCustomToast({ status: 'error' });
  const queryClient = useQueryClient();

  useEffect(() => {
    setTeamName(defaultTeamName);
  }, [defaultTeamName]);

  const mutation = useMutation({
    mutationFn: renameRequest,
    onSuccess() {
      setTeamName(defaultTeamName);
      queryClient.invalidateQueries({
        queryKey: ['teamList'],
        exact: false
      });
      queryClient.invalidateQueries({
        queryKey: ['ns-detail'],
        exact: false
      });
      onClose();
    },
    onError(error) {
      toast({ title: (error as ApiResp).message });
    }
  });
  const { t } = useTranslation();
  const submit = () => {
    mutation.mutate({ ns_uid, teamName });
  };

  return (
    <>
      <Button
        size={'sm'}
        height={'32px'}
        variant={'outline'}
        {...props}
        leftIcon={<EditIcon boxSize={'14px'} />}
        onClick={onOpen}
      >
        {t('common:rename')}
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
            {t('common:rename')}
          </ModalHeader>
          {mutation.isLoading ? (
            <Spinner mx="auto" />
          ) : (
            <ModalBody h="100%" w="100%" p="0" mt="22px">
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
