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
  Spinner,
  ButtonProps,
  HStack,
  useToast
} from '@chakra-ui/react';
import { MouseEventHandler, useEffect, useMemo, useState } from 'react';
import { ROLE_LIST, UserRole } from '@/types/team';
import useSessionStore from '@/stores/session';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getInviteCodeRequest, inviteMemberRequest } from '@/api/namespace';
import { vaildManage } from '@/utils/tools';
import { ApiResp } from '@/types';
import { useTranslation } from 'next-i18next';
import { GroupAddIcon } from '@sealos/ui';
import { useCopyData } from '@/hooks/useCopyData';
import { track } from '@sealos/gtm';
import { useConfigStore } from '@/stores/config';

const getValidExpireOptions = (values?: number[]) => {
  const validValues = values?.filter((value) => Number.isInteger(value) && value > 0) ?? [];
  return validValues.length ? validValues : [30];
};

const formatExpireOption = (minutes: number, language?: string) => {
  const isZh = language?.startsWith('zh');
  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    return isZh ? `${days} 天` : `${days} ${days === 1 ? 'day' : 'days'}`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return isZh ? `${hours} 小时` : `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  return isZh ? `${minutes} 分钟` : `${minutes} min`;
};

export default function InviteMember({
  ns_uid,
  workspaceName,
  ownRole,
  ...props
}: ButtonProps & {
  ns_uid: string;
  workspaceName: string;
  ownRole: UserRole;
}) {
  const { onOpen, isOpen, onClose } = useDisclosure();
  const session = useSessionStore((s) => s.session);
  const teamManagementConfig = useConfigStore((s) => s.teamManagementConfig);
  const expireOptions = useMemo(
    () => getValidExpireOptions(teamManagementConfig?.workspaceInviteExpiresInMinutes),
    [teamManagementConfig?.workspaceInviteExpiresInMinutes]
  );
  const [role, setRole] = useState(UserRole.Developer);
  const [expiresInMinutes, setExpiresInMinutes] = useState(expireOptions[0]);
  useEffect(() => {
    if (!expireOptions.includes(expiresInMinutes)) setExpiresInMinutes(expireOptions[0]);
  }, [expireOptions, expiresInMinutes]);
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
  const canManage = vaildManage(ownRole);
  const { t, i18n } = useTranslation();
  const { copyData } = useCopyData();
  const getLinkCode = useMutation({
    mutationFn: getInviteCodeRequest,
    mutationKey: [session?.user.ns_uid],
    onSuccess(_data, variables) {
      track('workspace_invite', {
        module: 'workspace',
        invite_role: variables.role === UserRole.Developer ? 'developer' : 'manager'
      });
    },
    onError() {
      toast({
        status: 'error',
        title: t('common:failed_to_generate_invitation_link'),
        isClosable: true,
        position: 'top'
      });
    }
  });

  const generateLink = (code: string) => {
    return window.location.origin + encodeURI(`/WorkspaceInvite/?code=${code}`);
  };
  const handleGenLink: MouseEventHandler<HTMLButtonElement> = async (e) => {
    e.preventDefault();
    const data = await getLinkCode.mutateAsync({
      ns_uid,
      role,
      expiresInMinutes
    });
    const code = data.data?.code!;
    const link = generateLink(code);
    await copyData(link, t('v2:invite_link_copied'));
  };
  return (
    <>
      {[UserRole.Manager, UserRole.Owner].includes(ownRole) ? (
        <Button
          size={'sm'}
          variant={'outline'}
          height={'32px'}
          {...props}
          leftIcon={<GroupAddIcon boxSize={'16px'} />}
          onClick={onOpen}
        >
          {t('common:invite_member')}
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
          <ModalCloseButton right={'24px'} top="16px" p="0" />
          <ModalHeader bg={'white'} border={'none'} p="0">
            {t('common:invite_member')}
          </ModalHeader>
          {mutation.isLoading ? (
            <Spinner mx="auto" />
          ) : (
            <ModalBody h="100%" w="100%" p="0" mt="22px">
              <Text>
                {t('common:invite_members_to_workspace', {
                  workspace: workspaceName
                })}
              </Text>
              <HStack gap={'8px'} justifyContent={'stretch'} mt="24px">
                <Flex direction="column" flex="1" gap="6px">
                  <Text fontSize="12px" color="#5A646E">
                    {t('common:role')}
                  </Text>
                  <Menu>
                    <MenuButton
                      as={Button}
                      variant={'unstyled'}
                      borderRadius="2px"
                      border="1px solid #DEE0E2"
                      bgColor="#FBFBFC"
                      w="100%"
                      px="12px"
                    >
                      <Flex alignItems={'center'} justifyContent={'space-between'}>
                        <Text>{ROLE_LIST[role]}</Text>
                        <Image
                          src="/images/material-symbols_expand-more-rounded.svg"
                          w="16px"
                          h="16px"
                          transform={'rotate(90deg)'}
                          alt="expand more"
                        />
                      </Flex>
                    </MenuButton>
                    <MenuList borderRadius={'2px'} minW={'unset'}>
                      {ROLE_LIST.map((role, idx) => (
                        <MenuItem
                          w="140px"
                          onClick={(e) => {
                            e.preventDefault();
                            setRole(idx);
                          }}
                          key={idx}
                        >
                          {role}
                        </MenuItem>
                      )).filter((_, i) => canManage(i, false) && i !== UserRole.Owner)}
                    </MenuList>
                  </Menu>
                </Flex>
                <Flex direction="column" flex="1" gap="6px">
                  <Text fontSize="12px" color="#5A646E">
                    {t('common:invite_link_expires')}
                  </Text>
                  <Menu>
                    <MenuButton
                      as={Button}
                      variant={'unstyled'}
                      borderRadius="2px"
                      border="1px solid #DEE0E2"
                      bgColor="#FBFBFC"
                      w="100%"
                      px="12px"
                    >
                      <Flex alignItems={'center'} justifyContent={'space-between'}>
                        <Text>{formatExpireOption(expiresInMinutes, i18n.language)}</Text>
                        <Image
                          src="/images/material-symbols_expand-more-rounded.svg"
                          w="16px"
                          h="16px"
                          transform={'rotate(90deg)'}
                          alt="expand more"
                        />
                      </Flex>
                    </MenuButton>
                    <MenuList borderRadius={'2px'} minW={'unset'}>
                      {expireOptions.map((minutes) => (
                        <MenuItem
                          w="116px"
                          onClick={(e) => {
                            e.preventDefault();
                            setExpiresInMinutes(minutes);
                          }}
                          key={minutes}
                        >
                          {formatExpireOption(minutes, i18n.language)}
                        </MenuItem>
                      ))}
                    </MenuList>
                  </Menu>
                </Flex>
              </HStack>
              <Flex mt="16px">
                <Button
                  w="100%"
                  variant={''}
                  bg="#24282C"
                  borderRadius={'4px'}
                  color="#fff"
                  py="6px"
                  px="12px"
                  _hover={{
                    opacity: '0.8'
                  }}
                  isDisabled={getLinkCode.isLoading}
                  onClick={handleGenLink}
                >
                  {t('common:generate_invitation_link')}
                </Button>
              </Flex>
            </ModalBody>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
