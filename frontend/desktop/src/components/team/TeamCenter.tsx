import {
  Box,
  Flex,
  Text,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  useDisclosure,
  Divider,
  Stack,
  IconButton,
  Center,
  VStack,
  Circle,
  HStack,
  StackProps,
  Portal,
  Button
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import CreateTeam from './CreateTeam';
import DissolveTeam from './DissolveTeam';
import { useQuery } from '@tanstack/react-query';
import { useCopyData } from '@/hooks/useCopyData';
import InviteMember from './InviteMember';
import UserTable from './userTable';
import useSessionStore from '@/stores/session';
import { InvitedStatus, NSType, UserRole, teamMessageDto } from '@/types/team';
import { TeamUserDto } from '@/types/user';
import ReciveMessage from './ReciveMessage';
import { nsListRequest, reciveMessageRequest, teamDetailsRequest } from '@/api/namespace';
import { useTranslation } from 'next-i18next';
import { AddIcon, CopyIcon, StorageIcon } from '@sealos/ui';
import NsListItem from '@/components/team/NsListItem';
import RenameTeam from './RenameTeam';
import { Plus, Settings } from 'lucide-react';
import useAppStore from '@/stores/app';
import { track } from '@sealos/gtm';

export default function TeamCenter({
  isOpen,
  onClose
}: { isOpen: boolean; onClose: () => void } & StackProps) {
  const createTeamDisclosure = useDisclosure();
  const session = useSessionStore((s) => s.session);
  const { installedApps, openApp, openDesktopApp } = useAppStore();
  const { t } = useTranslation();
  const user = session?.user;
  const default_ns_uid = user?.ns_uid || '';
  const default_nsid = user?.nsid || '';
  const userCrUid = user?.userCrUid || '';
  const k8s_username = user?.k8s_username || '';
  const { copyData } = useCopyData();
  const [nsid, setNsid] = useState(default_nsid);
  const [messageFilter, setMessageFilter] = useState<string[]>([]);
  const [ns_uid, setNs_uid] = useState(() =>
    default_nsid === 'ns-' + k8s_username ? '' : default_ns_uid
  );
  // team detail and users list
  const { data } = useQuery(
    ['ns-detail', 'teamGroup', { ns_uid, userCrUid }],
    () => teamDetailsRequest(ns_uid),
    {
      refetchInterval(data) {
        // is personal
        if (data?.data?.users?.some((x) => x.status === InvitedStatus.Inviting)) {
          return 2000;
        } else {
          return false;
        }
      },
      enabled: ns_uid !== ''
    }
  );
  const users: TeamUserDto[] = [...(data?.data?.users || [])];
  const curTeamUser = users.find((user) => user.crUid === userCrUid);
  const namespace = data?.data?.namespace;
  const isPrivate = namespace?.nstype === NSType.Private;
  // inviting message list
  const reciveMessage = useQuery({
    queryKey: ['teamRecive', 'teamGroup'],
    queryFn: reciveMessageRequest,
    refetchInterval: isOpen ? 3000 : false
  });
  const messages: teamMessageDto[] = reciveMessage.data?.data?.messages || [];
  // namespace list
  const { data: _namespaces } = useQuery({
    queryKey: ['teamList', 'teamGroup'],
    queryFn: nsListRequest,
    select(data) {
      return data.data?.namespaces;
    }
  });
  const namespaces = _namespaces || [];
  useEffect(() => {
    const defaultNamespace =
      namespaces?.length > 0
        ? namespaces[0]
        : {
            uid: '',
            id: ''
          };
    if (defaultNamespace && !_namespaces?.find((ns) => ns.uid === ns_uid)) {
      // after delete namespace
      setNs_uid(defaultNamespace.uid);
      setNsid(defaultNamespace.id);
    }
  }, [_namespaces, ns_uid]);

  useEffect(() => {
    if (isOpen) {
      track('module_view', {
        view_name: 'manage',
        module: 'workspace'
      });
    }
  }, [isOpen]);

  const openCostCenterApp = () => {
    openDesktopApp({
      appKey: 'system-costcenter',
      pathname: '/',
      query: {
        mode: 'create'
      },
      messageData: {
        type: 'InternalAppCall',
        mode: 'create'
      }
    });
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        isCentered
        closeOnOverlayClick={false}
        closeOnEsc={false}
      >
        <ModalOverlay />
        <ModalContent
          borderRadius={'20px'}
          maxW={'1000px'}
          h="550px"
          bgColor={'rgba(255, 255, 255, 0.9)'}
          backdropFilter="blur(150px)"
          // p={'4px'}
          // boxShadow={
          //   '0px 20px 25px -5px rgba(0, 0, 0, 0.10), 0px 10px 10px -5px rgba(0, 0, 0, 0.04)'
          // }
        >
          <ModalCloseButton zIndex={'99'} />
          <ModalBody
            display={'flex'}
            h="100%"
            w="100%"
            p="0"
            position={'relative'}
            // border={'1px solid #E4E4E7'}
            borderRadius={'16px'}
          >
            <Box position={'absolute'} bottom={'16px'} left="16px">
              {messages
                .filter((message) => !messageFilter.includes(message.ns_uid))
                .map((message) => (
                  <ReciveMessage
                    message={message}
                    key={message.ns_uid}
                    CloseTipHandler={(ns_uid) => {
                      setMessageFilter([...messageFilter, ns_uid]);
                    }}
                  />
                ))}
            </Box>
            <Stack flex="1" py="12px" bg={'#FAFAFA'} borderLeftRadius={'16px'}>
              <Flex py="8px" mx="14px" px="4px" justify={'space-between'} align={'center'} mb="4px">
                <Text fontSize={'16px'} fontWeight={'600'}>
                  {t('common:team')}
                </Text>
              </Flex>
              <Box overflow={'scroll'} h="0" flex="1" px="12px">
                <VStack spacing="4px" align="stretch">
                  {namespaces && namespaces.length > 0 ? (
                    namespaces.map((ns) => {
                      return (
                        <NsListItem
                          key={ns.uid}
                          width={'full'}
                          onClick={() => {
                            setNs_uid(ns.uid);
                            setNsid(ns.id);
                          }}
                          fontSize={'14px'}
                          displayPoint={false}
                          id={ns.uid}
                          isPrivate={ns.nstype === NSType.Private}
                          isSelected={ns.uid === ns_uid}
                          teamName={ns.teamName}
                          teamAvatar={ns.id}
                          selectedColor="rgba(0, 0, 0, 0.05)"
                        />
                      );
                    })
                  ) : (
                    <Center w="full" h="full">
                      <Text color={'grayModern.600'} fontSize={'12px'}>
                        {t('common:noworkspacecreated')}
                      </Text>
                    </Center>
                  )}
                </VStack>
                <Divider bg={'#F4F4F5'} h="1px" my={'4px'} />

                <Flex
                  alignItems={'center'}
                  gap={'8px'}
                  py={'6px'}
                  px={'8px'}
                  height={'40px'}
                  cursor={'pointer'}
                  onClick={() => {
                    console.log('create workspace');
                    openCostCenterApp();
                    onClose();
                  }}
                >
                  <Plus size={20} color="#737373" />
                  <Text fontSize="14px" fontWeight="400" color="#18181B">
                    {t('common:create_workspace')}
                  </Text>
                </Flex>
              </Box>
            </Stack>
            <VStack
              width={'730px'}
              borderLeft={'1px solid #E4E4E7'}
              bgColor={'white'}
              h="100%"
              alignItems={'stretch'}
              borderRightRadius={'16px'}
            >
              <Text fontSize={'16px'} fontWeight={'600'} px="16px" py="20px" width={'full'}>
                {t('common:manage_team')}
              </Text>
              {namespace ? (
                <>
                  <Box px="16px" pb="20px">
                    <Box mx="10px">
                      <Flex align={'center'} justifyContent={'space-between'}>
                        <Text fontSize={'24px'} fontWeight={'600'} mr="8px">
                          {isPrivate
                            ? `${t('common:default_team')} - ${namespace.teamName}`
                            : namespace.teamName}
                        </Text>
                        {curTeamUser?.role === UserRole.Owner && (
                          <HStack>
                            <RenameTeam
                              ml="auto"
                              ns_uid={ns_uid}
                              defaultTeamName={namespace.teamName}
                            />
                            {!isPrivate && (
                              <DissolveTeam
                                ml="auto"
                                nsid={nsid}
                                ns_uid={ns_uid}
                                onSuccess={(delete_ns_uid) => {
                                  if (delete_ns_uid === ns_uid) {
                                    setNs_uid('');
                                    setNsid('');
                                  }
                                }}
                              />
                            )}
                          </HStack>
                        )}
                      </Flex>
                      <Flex align={'center'} mt={'7px'} fontSize={'12px'}>
                        <Text color={'grayModern.600'}>
                          {t('common:team')} ID: {nsid}
                        </Text>
                        <IconButton
                          variant={'white-bg-icon'}
                          onClick={() => copyData(nsid)}
                          p="4px"
                          ml="5px"
                          icon={
                            <CopyIcon
                              color={'grayModern.500'}
                              boxSize={'14px'}
                              fill={'grayModern.500'}
                            />
                          }
                          aria-label={'copy nsid'}
                        />
                      </Flex>
                    </Box>
                  </Box>
                  <Divider bg={'rgba(0, 0, 0, 0.10)'} h="1px" />
                  <Stack mt="10px" mx="29px" flex={1}>
                    <Flex align={'center'} gap="6px" mb={'12px'}>
                      <Text>{t('common:member_list')}</Text>
                      {curTeamUser &&
                        [UserRole.Owner, UserRole.Manager].includes(curTeamUser.role) && (
                          <InviteMember
                            ownRole={curTeamUser?.role ?? UserRole.Developer}
                            ns_uid={ns_uid}
                            workspaceName={
                              isPrivate ? t('common:default_team') : namespace.teamName
                            }
                            ml="auto"
                          />
                        )}
                    </Flex>
                    <Box h="250px" overflow={'scroll'}>
                      <UserTable
                        users={users}
                        ns_uid={ns_uid}
                        nsid={nsid}
                        canAbdicate={!isPrivate}
                      />
                    </Box>
                  </Stack>
                </>
              ) : namespaces.length === 0 ? (
                <Center w="full" flex={'1'}>
                  <VStack gap={'20px'}>
                    <Circle size={'48px'} border={'0.5px dashed'} borderColor={'grayModern.400'}>
                      <StorageIcon boxSize={'29px'} />
                    </Circle>
                    <Text color={'grayModern.600'} fontSize={'12px'}>
                      {t('common:noworkspacecreated')}
                    </Text>
                    <Button
                      onClick={() => {
                        createTeamDisclosure.onOpen();
                      }}
                      variant={'primary'}
                      leftIcon={<AddIcon boxSize={'20px'} color={'white'} />}
                      iconSpacing={'8px'}
                    >
                      {t('common:create_team')}
                    </Button>
                  </VStack>
                </Center>
              ) : null}
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      <CreateTeam isOpen={createTeamDisclosure.isOpen} onClose={createTeamDisclosure.onClose} />
    </>
  );
}
