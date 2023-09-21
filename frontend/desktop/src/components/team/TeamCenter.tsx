import {
  Box,
  Flex,
  Text,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  useDisclosure,
  Divider,
  Stack
} from '@chakra-ui/react';
import NsList from './NsList';
import { useState } from 'react';
import CreateTeam from './CreateTeam';
import DissolveTeam from './DissolveTeam';
import { useQuery } from '@tanstack/react-query';
import { useCopyData } from '@/hooks/useCopyData';
import Iconfont from '../iconfont';
import { formatTime } from '@/utils/format';
import InviteMember from './InviteMember';
import UserTable from './userTable';
import useSessionStore from '@/stores/session';
import { InvitedStatus, NSType, UserRole, teamMessageDto } from '@/types/team';
import { TeamUserDto } from '@/types/user';
import ReciveMessage from './ReciveMessage';
import { reciveMessageRequest, teamDetailsRequest } from '@/api/namespace';
import { useTranslation } from 'react-i18next';
export default function TeamCenter() {
  const session = useSessionStore((s) => s.session);
  const { ns_uid: default_ns_uid, nsid: default_nsid, userId } = session.user;
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [nsid, setNsid] = useState(default_nsid);
  const [messageFilter, setMessageFilter] = useState<string[]>([]);
  const [ns_uid, setNs_uid] = useState(default_ns_uid);
  const { data } = useQuery(
    ['ns-detail', 'teamGroup', { ns_uid }],
    () => teamDetailsRequest(ns_uid),
    {
      refetchInterval(data) {
        if (data?.data?.users.some((x) => x.status === InvitedStatus.Inviting)) {
          return 2000;
        } else {
          return false;
        }
      }
    }
  );
  const reciveMessage = useQuery({
    queryKey: ['teamRecive', 'teamGroup'],
    queryFn: reciveMessageRequest,
    refetchInterval: isOpen ? 3000 : false
  });
  const { t } = useTranslation();
  const messages: teamMessageDto[] = reciveMessage.data?.data?.messages || [];
  const users: TeamUserDto[] = [...(data?.data?.users || [])];
  const curTeamUser = users.find((user) => user.uid === userId);
  const teamName = data?.data?.namespace.teamName || '';
  const createTime = data?.data?.namespace.createTime || '';
  const isTeam = data?.data?.namespace.nstype === NSType.Team;
  const { copyData } = useCopyData();
  return (
    <>
      <Flex
        ml="auto"
        _hover={{
          bgColor: 'rgba(0, 0, 0, 0.03)'
        }}
        w="28px"
        h="28px"
        mr="6px"
        transition={'all 0.3s'}
        justify={'center'}
        align={'center'}
      >
        <Image
          cursor={'pointer'}
          onClick={() => {
            // 清理消息过滤
            setMessageFilter([]);
            onOpen();
          }}
          src="/images/uil_setting.svg"
          h="20px"
          w="20px"
        />
      </Flex>
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
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
                      // 纳入被过滤的消息
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
                  {t('Team')}
                </Text>
                <CreateTeam />
              </Flex>
              <Box overflow={'scroll'} h="0" flex="1" px="16px">
                <NsList
                  displayPoint={false}
                  selected_ns_uid={ns_uid}
                  click={(ns) => {
                    setNs_uid(ns.uid);
                    setNsid(ns.id);
                  }}
                  nullNs={(ns) => {
                    setNs_uid(ns.uid);
                    setNsid(ns.id);
                  }}
                />
              </Box>
            </Stack>
            {curTeamUser && (
              <Box width={'730px'} borderRadius={'8px'} bgColor={'white'} h="100%">
                <Box px="16px" py="20px">
                  <Text fontSize={'16px'} fontWeight={'600'}>
                    {t('Manage Team')}
                  </Text>
                  <Box mx="10px" mt="22px">
                    <Flex align={'center'}>
                      <Text fontSize={'24px'} fontWeight={'600'} mr="8px">
                        {teamName}
                      </Text>
                      {isTeam && curTeamUser.role === UserRole.Owner && (
                        <DissolveTeam
                          ml="auto"
                          nsid={nsid}
                          ns_uid={ns_uid}
                          onSuccess={(delete_ns_uid) => {
                            if (delete_ns_uid === ns_uid) {
                              setNs_uid(default_ns_uid);
                              setNsid(default_nsid);
                            }
                          }}
                        />
                      )}
                    </Flex>
                    <Flex align={'center'} color={'#5A646E'} mt={'7px'} fontSize={'12px'}>
                      <Text>
                        {t('Team')} ID: {nsid}
                      </Text>
                      <Box onClick={() => copyData(nsid)} cursor={'pointer'} ml="5px">
                        <Iconfont
                          iconName="icon-copy2"
                          width={14}
                          height={14}
                          color="rgb(123, 131, 139)"
                        ></Iconfont>
                      </Box>
                      <Text ml="24px">
                        {t('Created Time')}: {createTime ? formatTime(createTime) : ''}
                      </Text>
                    </Flex>
                  </Box>
                </Box>
                <Divider bg={'rgba(0, 0, 0, 0.10)'} h="1px" />
                <Stack mt="15px" mx="29px" flex={1}>
                  <Flex align={'center'} gap="6px" mb={'12px'}>
                    <Image src={'/images/list.svg'} w="20px" h="20px" />
                    <Text>{t('Member List')}</Text>
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
                    {isTeam && [UserRole.Owner, UserRole.Manager].includes(curTeamUser!.role) && (
                      <InviteMember
                        ownRole={curTeamUser.role ?? UserRole.Developer}
                        nsid={nsid}
                        ns_uid={ns_uid}
                        buttonType="button"
                        ml="auto"
                      />
                    )}
                  </Flex>
                  <Box h="250px" overflow={'scroll'}>
                    <UserTable users={users} isTeam={isTeam} ns_uid={ns_uid} nsid={nsid} />
                  </Box>
                </Stack>
              </Box>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
