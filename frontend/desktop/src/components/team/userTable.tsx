import useSessionStore from '@/stores/session';
import { InvitedStatus, UserRole } from '@/types/team';
import { TeamUserDto } from '@/types/user';
import { formatTime } from '@/utils/format';
import {
  Image,
  Text,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Flex
} from '@chakra-ui/react';
import { vaildManage } from '@/utils/tools';
import RemoveMember from './RemoveMember';
import Abdication from './Abdication';
import ModifyRole from './ModifyRole';
export default function UserTable({
  users = [],
  isTeam,
  ns_uid,
  nsid
}: {
  users: TeamUserDto[];
  isTeam: boolean;
  ns_uid: string;
  nsid: string;
}) {
  const headList = ['用户名', '权限', '加入时间', '状态', '操作'];
  const session = useSessionStore((s) => s.session);
  const { userId, k8s_username } = session.user;
  const userSelf = users.find((user) => user.uid === userId && user.k8s_username === k8s_username);
  const status = ['等待加入', '已加入'];
  const canManage = vaildManage(userSelf?.role ?? UserRole.Developer, '');
  const abdicationUser = users.filter(
    (user) => user.uid !== userSelf?.uid && user.status === InvitedStatus.Accepted
  );
  const vaildateRoles: UserRole[] = [];
  if (userSelf?.role === UserRole.Owner) vaildateRoles.push(UserRole.Manager, UserRole.Developer);
  else if (userSelf?.role === UserRole.Manager) vaildateRoles.push(UserRole.Developer);
  return userSelf ? (
    <TableContainer>
      <Table variant={'simple'} fontSize={'12px'}>
        <Thead color={'#5A646E'} borderRadius="2px" background="#F1F4F6">
          <Tr>
            {headList.map((v, k) => (
              <Th
                key={k}
                _before={{
                  content: `""`,
                  display: 'block',
                  borderTopLeftRadius: '10px',
                  borderTopRightRadius: '10px',
                  background: '#F1F4F6'
                }}
                fontSize={'12px'}
                py="13px"
              >
                {v}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {users.map((user) => (
            <Tr key={user.k8s_username}>
              <Td color={'#24282C'}>
                <Flex>
                  <Image
                    src={user.avatarUrl}
                    fallbackSrc={'/images/sealos.svg'}
                    w="20px"
                    h="20px"
                    mr="8px"
                    borderRadius={'50%'}
                  />
                  <Text fontWeight={'600'}>{user.name}</Text>
                </Flex>
              </Td>
              <Td color={'#24282C'} fontWeight={'600'}>
                <ModifyRole
                  ns_uid={ns_uid}
                  roles={vaildateRoles}
                  currentRole={user.role}
                  userId={user.uid}
                  k8s_username={user.k8s_username}
                  isDisabled={
                    user.status === InvitedStatus.Inviting ||
                    !canManage(user.role, userId) ||
                    user.uid === userId
                  }
                />
              </Td>
              <Td color={'#5A646E'}>{user.joinTime ? formatTime(user.joinTime) : '-'}</Td>
              <Td color={user.status === InvitedStatus.Inviting ? '#8172D8' : '#00A9A6'}>
                {status[user.status]}
              </Td>
              <Td>
                {isTeam ? (
                  canManage(user.role, userId) ? (
                    user.role === UserRole.Owner && abdicationUser.length !== 0 ? (
                      <Abdication ns_uid={ns_uid} users={abdicationUser} />
                    ) : (
                      <RemoveMember
                        nsid={nsid}
                        ns_uid={ns_uid}
                        status={user.status}
                        k8s_username={user.k8s_username}
                        userId={user.uid}
                      />
                    )
                  ) : (
                    <></>
                  )
                ) : (
                  <></>
                )}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  ) : (
    <></>
  );
}
