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
  Flex,
  Menu,
  MenuList,
  MenuItem,
  MenuButton
} from '@chakra-ui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserRole } from '@/types/team';
import { TeamUserDto } from '@/types/user';
import { useState } from 'react';
import ExchangeIcon from '../icons/ExchangeIcon';
import { abdicateRequest } from '@/api/namespace';
import { useCustomToast } from '@/hooks/useCustomToast';
import { ApiResp } from '@/types';
import { useTranslation } from 'next-i18next';
export default function Abdication({
  ns_uid,
  users,
  ...props
}: {
  users: TeamUserDto[];
  ns_uid: string;
} & Parameters<typeof Button>[0]) {
  const { t } = useTranslation();
  const { onOpen, isOpen, onClose } = useDisclosure();
  const queryClient = useQueryClient();
  const defaultUser = users[0];
  const [targetUser, setTargetUser] = useState({
    name: defaultUser?.name || '',
    avatar: defaultUser?.avatarUrl || '',
    uid: defaultUser?.uid || '',
    k8s_username: defaultUser?.k8s_username || ''
  });
  const { toast } = useCustomToast({ status: 'error' });
  const mutation = useMutation({
    mutationFn: abdicateRequest,
    onSuccess() {
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
  const submit = () => {
    mutation.mutate({
      ns_uid,
      targetUserId: targetUser.uid,
      targetUsername: targetUser.k8s_username
    });
  };
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
        <ExchangeIcon boxSize="16px" mr="4px" />
        <Text fontSize={'12px'}>{t('Abdication')}</Text>
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
          <ModalHeader p="0">{t('Abdication')}</ModalHeader>
          {mutation.isLoading ? (
            <Spinner mx="auto" />
          ) : (
            <ModalBody h="100%" w="100%" p="0" mt="22px">
              <Menu>
                <MenuButton
                  as={Button}
                  variant={'unstyled'}
                  borderRadius="2px"
                  border="1px solid #DEE0E2"
                  bgColor="#FBFBFC"
                  w="100%"
                  mt="24px"
                  px="12px"
                >
                  <Flex alignItems={'center'}>
                    <Image
                      src={targetUser.avatar}
                      fallbackSrc={'/images/sealos.svg'}
                      boxSize={'24px'}
                      borderRadius={'50%'}
                      mr="8px"
                    />
                    <Text>{targetUser.name}</Text>
                    {users.length > 1 && (
                      <Image
                        ml="auto"
                        src="/images/material-symbols_expand-more-rounded.svg"
                        w="16px"
                        h="16px"
                        transform={'rotate(90deg)'}
                      />
                    )}
                  </Flex>
                </MenuButton>
                <MenuList borderRadius={'2px'}>
                  {users
                    .map((user, idx) => (
                      <MenuItem
                        w="330px"
                        onClick={(e) => {
                          e.preventDefault();
                          setTargetUser({
                            name: user.name,
                            avatar: user.avatarUrl,
                            k8s_username: user.k8s_username,
                            uid: user.uid
                          });
                        }}
                        key={idx}
                      >
                        <Image
                          src={targetUser.avatar}
                          fallbackSrc={'/images/sealos.svg'}
                          boxSize={'24px'}
                          borderRadius={'50%'}
                          mr="8px"
                        />
                        <Text>{targetUser.name}</Text>
                      </MenuItem>
                    ))
                    .filter((_, i) => i != UserRole.Owner)}
                </MenuList>
              </Menu>
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
