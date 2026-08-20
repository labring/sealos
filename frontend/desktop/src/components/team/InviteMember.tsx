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
import { MouseEventHandler, useState } from 'react';
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
import { needsClipboardWorkaround } from '@/utils/browserDetect';

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
  const [role, setRole] = useState(UserRole.Developer);
  const [inviteLink, setInviteLink] = useState<string>('');
  const [isFallbackMode, setIsFallbackMode] = useState(false);
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
  const { t } = useTranslation();
  const { copyData } = useCopyData();
  const getLinkCode = useMutation({
    mutationFn: getInviteCodeRequest,
    mutationKey: [session?.user?.ns_uid],
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

    // Get the invitation link first
    const data = await getLinkCode.mutateAsync({
      ns_uid,
      role
    });
    const code = data.data?.code!;
    const link = generateLink(code);

    // Check if browser needs workaround (Safari/iOS)
    if (needsClipboardWorkaround()) {
      // Safari: Show link and separate copy button
      setInviteLink(link);
      setIsFallbackMode(true);
      return;
    }

    // Other browsers: Try to copy directly
    try {
      await copyData(link, t('v2:invite_link_copied'));
      setIsFallbackMode(false);
    } catch (error) {
      // If copy fails, fall back to showing the link
      console.warn('Direct copy failed, showing link for manual copy', error);
      setInviteLink(link);
      setIsFallbackMode(true);
    }
  };

  const handleCopyLink: MouseEventHandler<HTMLButtonElement> = async (e) => {
    e.preventDefault();
    await copyData(inviteLink, t('v2:invite_link_copied'));
  };

  const handleClose = () => {
    setInviteLink('');
    setIsFallbackMode(false);
    onClose();
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
      <Modal isOpen={isOpen} onClose={handleClose} isCentered>
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
              <HStack gap={'8px'} justifyContent={'stretch'}>
                <Menu>
                  <MenuButton
                    as={Button}
                    variant={'unstyled'}
                    borderRadius="2px"
                    border="1px solid #DEE0E2"
                    bgColor="#FBFBFC"
                    w="140px"
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
                          setInviteLink(''); // Clear link when role changes
                          setIsFallbackMode(false);
                        }}
                        key={idx}
                      >
                        {role}
                      </MenuItem>
                    )).filter((_, i) => canManage(i, false) && i !== UserRole.Owner)}
                  </MenuList>
                </Menu>
                <Button
                  flex={'1'}
                  variant={''}
                  bg="#24282C"
                  borderRadius={'4px'}
                  color="#fff"
                  py="6px"
                  px="12px"
                  mt="24px"
                  _hover={{
                    opacity: '0.8'
                  }}
                  isDisabled={getLinkCode.isLoading}
                  onClick={handleGenLink}
                >
                  {inviteLink && isFallbackMode
                    ? t('common:regenerate_link')
                    : t('common:generate_invitation_link')}
                </Button>
              </HStack>
              {inviteLink && isFallbackMode && (
                <Flex
                  mt="16px"
                  p="12px"
                  borderRadius="4px"
                  border="1px solid #DEE0E2"
                  bgColor="#FBFBFC"
                  gap="8px"
                  alignItems="center"
                >
                  <Text
                    flex="1"
                    fontSize="sm"
                    color="#5A646E"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                  >
                    {inviteLink}
                  </Text>
                  <Button size="sm" variant="outline" onClick={handleCopyLink} flexShrink={0}>
                    {t('common:copy')}
                  </Button>
                </Flex>
              )}
            </ModalBody>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
