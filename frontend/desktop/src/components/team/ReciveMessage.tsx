import {
  Button,
  CloseButton,
  Flex,
  Text,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  useDisclosure,
  Box
} from '@chakra-ui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ROLE_LIST, teamMessageDto } from '@/types/team';
import { reciveAction, verifyInviteRequest } from '@/api/namespace';
import { useTranslation } from 'react-i18next';
export default function ReciveMessage({
  message,
  CloseTipHandler,
  ...props
}: {
  CloseTipHandler: (ns_uid: string) => void;
  message: teamMessageDto;
} & Parameters<typeof Flex>[0]) {
  const { onOpen, isOpen, onClose } = useDisclosure();
  const queryClient = useQueryClient();
  const mutation = useMutation(verifyInviteRequest, {
    onSuccess(data) {
      if (data.code === 200) {
        queryClient.invalidateQueries({ queryKey: ['ns-detail'] });
        queryClient.invalidateQueries({ queryKey: ['teamRecive'] });
        queryClient.invalidateQueries({ queryKey: ['teamList'] });
        onClose();
      }
    }
  });
  const { t, i18n } = useTranslation();
  const submit = (action: reciveAction) => {
    //!todo
    mutation.mutate({
      ns_uid: message.ns_uid,
      action
    });
  };
  return (
    <>
      <Flex
        {...props}
        py="8px"
        px="12px"
        borderRadius="4px"
        background="#485058"
        mt="8px"
        backdropFilter="blur(25px)"
        fontSize="11px"
        align={'center'}
      >
        <Text color={'#fff'}>
          {i18n.language === 'zh'
            ? `邀请你到${message.teamName}当${ROLE_LIST[message.role]}`
            : `invite you join in ${message.teamName} as ${ROLE_LIST[message.role]}`}
        </Text>
        <Text
          color="#219BF4"
          cursor={'pointer'}
          onClick={() => {
            onOpen();
          }}
          ml="18px"
          mr="16px"
        >
          {t('Handle')}
        </Text>
        <CloseButton
          onClick={() => {
            CloseTipHandler(message.ns_uid);
          }}
          w="12px"
          h="12px"
          color={'#fff'}
        />
      </Flex>
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent
          borderRadius={'4px'}
          maxW={'380px'}
          bgColor={'#FFF'}
          backdropFilter="blur(150px)"
          p="24px"
        >
          <ModalCloseButton right={'24px'} top="24px" p="0" color={'#24282C'} />
          <ModalHeader p="0">invite member</ModalHeader>
          {mutation.isLoading ? (
            <Spinner mx={'auto'} />
          ) : (
            <>
              <ModalBody h="100%" w="100%" p="0" mt="22px">
                <Box>
                  {message.managerName} invite you join the {message.teamName} as {message.role}
                </Box>
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
                      submit(reciveAction.Reject);
                    }}
                  >
                    {t('Reject')}
                  </Button>
                  <Button
                    variant={'unstyled'}
                    bg="#24282C"
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
                      submit(reciveAction.Accepte);
                    }}
                  >
                    {t('Accept')}
                  </Button>
                </Flex>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
