import {
  Button,
  Flex,
  IconButton,
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
import { useTranslation } from 'next-i18next';
import { AddIcon, GroupAddIcon } from '@sealos/ui';
export default function CreateTeam({ textButton = false }: { textButton?: boolean }) {
  const { onOpen, isOpen, onClose } = useDisclosure();
  const { t } = useTranslation();
  const [teamName, setTeamName] = useState('');
  const session = useSessionStore((s) => s.session);
  const userCrUid = session?.user?.userCrUid;
  const queryClient = useQueryClient();
  const { toast } = useCustomToast({ status: 'error' });
  const mutation = useMutation(createRequest, {
    mutationKey: [{ teamName, userCrUid }],
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
      {textButton ? (
        <Button
          onClick={() => {
            onOpen();
            setTeamName('');
          }}
          variant={'primary'}
          leftIcon={<AddIcon boxSize={'20px'} color={'white'} />}
          iconSpacing={'8px'}
        >
          {t('common:create_team')}
        </Button>
      ) : (
        <IconButton
          onClick={() => {
            onOpen();
            setTeamName('');
          }}
          variant={'white-bg-icon'}
          mr="4px"
          p="4px"
          aria-label={'create team'}
          icon={<AddIcon boxSize={'20px'} color={'brightBlue.600'} />}
        />
      )}
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
            {t('common:create_team')}
          </ModalHeader>
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
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
