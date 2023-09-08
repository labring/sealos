import {
  Button,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  useDisclosure,
  useToast
} from '@chakra-ui/react';
import CustomInput from './Input';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import useSessionStore from '@/stores/session';
import { createRequest } from '@/api/namespace';
import { useCustomToast } from '@/hooks/useCustomToast';
import { ApiResp } from '@/types';
export default function CreateTeam() {
  const { onOpen, isOpen, onClose } = useDisclosure();
  const [teamName, setTeamName] = useState('');
  const session = useSessionStore((s) => s.session);
  const userId = session.user.userId;
  const queryClient = useQueryClient();
  const { toast } = useCustomToast({ status: 'error' });
  const mutation = useMutation(createRequest, {
    mutationKey: [{ teamName, userId }],
    onSuccess(data) {
      if (data.code === 200) {
        queryClient.invalidateQueries({ queryKey: ['teamList'] });
        onClose();
      }
    },
    onError(error) {
      toast({ title: (error as ApiResp).message });
    }
  });
  const submit = () => {
    //!todo
    mutation.mutate({ teamName });
  };
  return (
    <>
      <Image
        cursor={'pointer'}
        onClick={() => {
          onOpen();
          setTeamName('');
        }}
        src="/images/material-symbols_add.svg"
        h="16px"
        w="16px"
        mr="4px"
      />
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
          <ModalHeader p="0">create team</ModalHeader>
          {mutation.isLoading ? (
            <Spinner mx={'auto'} />
          ) : (
            <>
              <ModalBody h="100%" w="100%" p="0" mt="22px">
                <CustomInput
                  onChange={(e) => {
                    e.preventDefault();
                    setTeamName(e.target.value);
                  }}
                  placeholder="team name"
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
                  {' '}
                  confrim{' '}
                </Button>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
