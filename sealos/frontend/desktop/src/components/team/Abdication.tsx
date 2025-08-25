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
  MenuButton,
  ButtonProps
} from '@chakra-ui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TeamUserDto } from '@/types/user';
import { useState } from 'react';
import { abdicateRequest } from '@/api/namespace';
import { useCustomToast } from '@/hooks/useCustomToast';
import { ApiResp } from '@/types';
import { useTranslation } from 'next-i18next';
import { ExchangeIcon, ExpanMoreIcon } from '@sealos/ui';
import { useConfigStore } from '@/stores/config';

export default function Abdication({
  ns_uid,
  users,
  ...props
}: {
  users: TeamUserDto[];
  ns_uid: string;
} & ButtonProps) {
  const logo = useConfigStore().layoutConfig?.logo;
  const { t } = useTranslation();
  const { onOpen, isOpen, onClose } = useDisclosure();
  const queryClient = useQueryClient();
  const defaultUser = users[0];
  const [targetUser, setTargetUser] = useState({
    name: defaultUser?.nickname || '',
    avatar: defaultUser?.avatarUrl || '',
    uid: defaultUser?.uid || '',
    k8s_username: defaultUser?.k8s_username || '',
    crUid: defaultUser?.crUid || ''
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
      targetUserCrUid: targetUser.crUid
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
        <Text fontSize={'12px'}>{t('common:abdication')}</Text>
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
            {t('common:abdication')}
          </ModalHeader>
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
                      alt="avatar"
                      src={targetUser.avatar}
                      fallbackSrc={logo || '/logo.svg'}
                      boxSize={'24px'}
                      borderRadius={'50%'}
                      mr="8px"
                    />
                    <Text>{targetUser.name}</Text>
                    {users.length > 1 && <ExpanMoreIcon boxSize={'16px'} ml="auto" />}
                  </Flex>
                </MenuButton>
                <MenuList borderRadius={'2px'}>
                  {users.map((user) => (
                    <MenuItem
                      w="330px"
                      onClick={(e) => {
                        e.preventDefault();
                        setTargetUser({
                          name: user.nickname,
                          avatar: user.avatarUrl,
                          k8s_username: user.k8s_username,
                          uid: user.uid,
                          crUid: user.crUid
                        });
                      }}
                      key={user.uid}
                    >
                      <Image
                        alt="logo"
                        src={user.avatarUrl}
                        fallbackSrc={logo || '/logo.svg'}
                        boxSize={'24px'}
                        borderRadius={'50%'}
                        mr="8px"
                      />
                      <Text>{user.nickname}</Text>
                    </MenuItem>
                  ))}
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
                {t('common:confirm')}
              </Button>
            </ModalBody>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
