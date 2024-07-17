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
  ButtonProps,
  Center,
  VStack,
  Circle,
  HStack,
  StackProps
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import CreateTeam from './CreateTeam';
import DissolveTeam from './DissolveTeam';
import { useQuery } from '@tanstack/react-query';
import { useCopyData } from '@/hooks/useCopyData';
import { formatTime } from '@/utils/format';
import InviteMember from './InviteMember';
import UserTable from './userTable';
import useSessionStore from '@/stores/session';
import { InvitedStatus, NSType, UserRole, teamMessageDto } from '@/types/team';
import { TeamUserDto } from '@/types/user';
import ReciveMessage from './ReciveMessage';
import { nsListRequest, reciveMessageRequest, teamDetailsRequest } from '@/api/namespace';
import { useTranslation } from 'next-i18next';
import { CopyIcon, ListIcon, SettingIcon, StorageIcon } from '@sealos/ui';
import NsListItem from '@/components/team/NsListItem';

export default function TeamCenter(props: StackProps) {
  const session = useSessionStore((s) => s.session);
  const { t } = useTranslation();
  const user = session?.user;
  const default_ns_uid = user?.ns_uid || '';
  const default_nsid = user?.nsid || '';
  const userCrUid = user?.userCrUid || '';
  const k8s_username = user?.k8s_username || '';
  const { isOpen, onOpen, onClose } = useDisclosure();
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
  const isTeam = namespace?.nstype === NSType.Team;
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
  const namespaces = _namespaces?.filter((ns) => ns.nstype !== NSType.Private) || [];
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

  return (
    <>
      <HStack
        gap={'8px'}
        alignItems={'center'}
        p={'6px 4px'}
        cursor={'pointer'}
        borderRadius={'4px'}
        onClick={() => {
          setMessageFilter([]);
          onOpen();
        }}
        {...props}
        _hover={{
          bgColor: 'rgba(0, 0, 0, 0.03)'
        }}
        pb={'10px'}
        borderBottom={'1px solid rgba(0, 0, 0, 0.05)'}
        mb={'4px'}
      >
        <SettingIcon boxSize={'16px'} color={'white'} />
        <Text>{t('common:manage_team')}</Text>
      </HStack>

      <Modal isOpen={isOpen} onClose={onClose} isCentered closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent
          borderRadius={'8px'}
          maxW={'1000px'}
          h="550px"
          bgColor={'rgba(255, 255, 255, 0.9)'}
          backdropFilter="blur(150px)"
        >
          <ModalCloseButton zIndex={'99'} />
          <ModalBody display={'flex'} h="100%" w="100%" p="0" position={'relative'}>
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
            <Stack flex="1" py="12px">
              <Flex
                py="8px"
                mx="14px"
                px="4px"
                justify={'space-between'}
                align={'center'}
                mb="4px"
                borderBottom="1.5px solid rgba(0, 0, 0, 0.05)"
              >
                <Text fontSize={'16px'} fontWeight={'600'}>
                  {t('common:team')}
                </Text>
                <CreateTeam />
              </Flex>
              <Box overflow={'scroll'} h="0" flex="1" px="16px">
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
                        p={'7.5px 9px'}
                        fontSize={'14px'}
                        displayPoint={false}
                        id={ns.uid}
                        isPrivate={ns.nstype === NSType.Private}
                        isSelected={ns.uid === ns_uid}
                        teamName={ns.teamName}
                        selectedColor="#0884DD"
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
              </Box>
            </Stack>
            <VStack
              width={'730px'}
              borderRadius={'8px'}
              bgColor={'white'}
              h="100%"
              alignItems={'stretch'}
            >
              <Text fontSize={'16px'} fontWeight={'600'} px="16px" py="20px" width={'full'}>
                {t('common:manage_team')}
              </Text>
              {namespace ? (
                <>
                  <Box px="16px" pb="20px">
                    <Box mx="10px">
                      <Flex align={'center'}>
                        <Text fontSize={'24px'} fontWeight={'600'} mr="8px">
                          {namespace.teamName}
                        </Text>
                        {isTeam && curTeamUser?.role === UserRole.Owner && (
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
                        <Text ml="24px">
                          {t('common:created_time')}:{' '}
                          {namespace.createTime ? formatTime(namespace.createTime) : ''}
                        </Text>
                      </Flex>
                    </Box>
                  </Box>
                  <Divider bg={'rgba(0, 0, 0, 0.10)'} h="1px" />
                  <Stack mt="15px" mx="29px" flex={1}>
                    <Flex align={'center'} gap="6px" mb={'12px'}>
                      <ListIcon boxSize={'20px'} />
                      <Text>{t('common:member_list')}</Text>
                      <Flex
                        py="0px"
                        px="6px"
                        fontSize={'10px'}
                        fontWeight={'600'}
                        gap="10px"
                        justifyContent={'center'}
                        align={'center'}
                        borderRadius="30px"
                        background="#EFF0F1"
                        color={'#5A646E'}
                        minW="23px"
                      >
                        {users.length}
                      </Flex>
                      {isTeam &&
                        curTeamUser &&
                        [UserRole.Owner, UserRole.Manager].includes(curTeamUser.role) && (
                          <InviteMember
                            ownRole={curTeamUser?.role ?? UserRole.Developer}
                            ns_uid={ns_uid}
                            workspaceName={namespace.teamName}
                            ml="auto"
                          />
                        )}
                    </Flex>
                    <Box h="250px" overflow={'scroll'}>
                      <UserTable users={users} isTeam={isTeam} ns_uid={ns_uid} nsid={nsid} />
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
                    <CreateTeam textButton />
                  </VStack>
                </Center>
              ) : null}
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
