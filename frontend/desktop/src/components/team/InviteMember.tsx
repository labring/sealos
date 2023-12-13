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
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Text,
  Flex,
  useToast,
  Spinner,
  FlexProps,
  ButtonProps
} from '@chakra-ui/react';
import CustomInput from './Input';
import { useState } from 'react';
import { ROLE_LIST, UserRole } from '@/types/team';
import useSessionStore from '@/stores/session';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { inviteMemberRequest } from '@/api/namespace';
import { vaildManage } from '@/utils/tools';
import { ApiResp } from '@/types';
import { useTranslation } from 'react-i18next';
import { GroupAddIcon } from '@sealos/ui';
export default function InviteMember({
  ns_uid,
  ownRole,
  ...props
}: ButtonProps & {
  ns_uid: string;
  ownRole: UserRole;
}) {
  const { onOpen, isOpen, onClose } = useDisclosure();
  const session = useSessionStore((s) => s.session);
  const { k8s_username } = session.user;
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState(UserRole.Developer);
  const toast = useToast();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: inviteMemberRequest,
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ['ns-detail'], exact: false });
      onClose();
    },
    onError(error) {
      toast({
        status: 'error',
        title: (error as ApiResp).message,
        isClosable: true,
        position: 'top'
      });
    }
  });
  const canManage = vaildManage(ownRole, 'x');
  const { t } = useTranslation();
  const submit = () => {
    let trim_to = userId.trim();
    if (!trim_to || trim_to.length < 6) {
      toast({
        status: 'error',
        title: t('Invalid User ID'),
        isClosable: true,
        position: 'top'
      });
      return;
    }
    const tk8s_username = trim_to.startsWith('ns-') ? trim_to.replace('ns-', '') : trim_to;
    if (tk8s_username === k8s_username) {
      toast({
        status: 'error',
        title: t('The invited user must be others'),
        isClosable: true,
        position: 'top'
      });
      return;
    }
    mutation.mutate({
      ns_uid,
      targetUsername: trim_to.replace('ns-', ''),
      role
    });
  };
  return (
    <>
      {[UserRole.Manager, UserRole.Owner].includes(ownRole) ? (
        <Button
          onClick={onOpen}
          borderRadius="4px"
          border="1px solid #DEE0E2"
          background="#F4F6F8"
          fontSize={'12px'}
          fontWeight={'500'}
          h="auto"
          py="7px"
          px="16px"
          leftIcon={<GroupAddIcon boxSize={'16px'} color={'grayModern.600'} />}
          {...props}
        >
          {t('Invite Member')}
        </Button>
      ) : (
        <></>
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
          <ModalCloseButton right={'24px'} top="24px" p="0" />
          <ModalHeader p="0">{t('Invite Member')}</ModalHeader>
          {mutation.isLoading ? (
            <Spinner mx="auto" />
          ) : (
            <ModalBody h="100%" w="100%" p="0" mt="22px">
              <CustomInput
                onChange={(e) => {
                  e.preventDefault();
                  setUserId(e.target.value);
                }}
                placeholder={t('private team ID of user') || ''}
                value={userId}
              />
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
                  <Flex alignItems={'center'} justifyContent={'space-between'}>
                    <Text>{ROLE_LIST[role]}</Text>
                    <Image
                      src="/images/material-symbols_expand-more-rounded.svg"
                      w="16px"
                      h="16px"
                      transform={'rotate(90deg)'}
                    />
                  </Flex>
                </MenuButton>
                <MenuList borderRadius={'2px'}>
                  {ROLE_LIST.map((role, idx) => (
                    <MenuItem
                      w="330px"
                      onClick={(e) => {
                        e.preventDefault();
                        setRole(idx);
                      }}
                      key={idx}
                    >
                      {role}
                    </MenuItem>
                  )).filter((_, i) => canManage(i, 'y') && i !== UserRole.Owner)}
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
