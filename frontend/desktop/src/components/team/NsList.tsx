import { useCopyData } from '@/hooks/useCopyData';
import request from '@/services/request';
import { Box, Flex, Text } from '@chakra-ui/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Iconfont from '../iconfont';
import { ApiResp } from '@/types';
import InviteMember from './InviteMember';
import { NSType, NamespaceDto, UserRole } from '@/types/team';
// import useSessionStore from '@/stores/session';
const NsList = ({
  click,
  // selected,
  selected_ns_uid,
  nullNs,
  ...boxprop
}: {
  click?: (ns: NamespaceDto) => void;
  selected_ns_uid: string;
  nullNs?: (privateNamespace: NamespaceDto) => void;
  // selected: (ns: NamespaceDto) => boolean;
} & Parameters<typeof Box>[0]) => {
  // const session = useSessionStore((s) => s.session);
  // const { userId, k8s_username, ns_uid } = session.user;
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: [
      'teamList',
      'teamGroup'
      // {
      //   userId,
      //   k8s_username
      // }
    ],
    queryFn: () =>
      request<any, ApiResp<{ namespaces: (NamespaceDto & { role: UserRole })[] }>>(
        '/api/auth/namespace/list'
      )
  });
  const { copyData } = useCopyData();
  const namespaces = data?.data?.namespaces || [];
  const namespace = namespaces.find((x) => x.uid === selected_ns_uid);
  const privateNamespace = namespaces.find((x) => x.nstype === NSType.Private);
  if (!namespace && namespaces.length > 0 && privateNamespace) {
    // 被删了
    nullNs && nullNs(privateNamespace);
  }
  return (
    <Box {...boxprop}>
      {namespaces.length > 0 &&
        namespaces.map((ns) => (
          <Flex
            key={ns.id}
            align={'center'}
            py="6px"
            mb="2px"
            position={'relative'}
            borderRadius="2px"
            {...(selected_ns_uid === ns.uid
              ? {
                  background: 'rgba(0, 0, 0, 0.05)'
                }
              : {})}
            px={'4px'}
            _hover={{
              '> .namespace-option': {
                display: 'flex'
              },
              bgColor: 'rgba(0, 0, 0, 0.03)'
            }}
          >
            <Flex
              align={'center'}
              cursor={'pointer'}
              onClick={(e) => {
                e.preventDefault();
                queryClient.invalidateQueries({ queryKey: ['teamList'] });

                click && click(ns);
              }}
              width={'full'}
            >
              <Box
                w="8px"
                h="8px"
                mr="8px"
                borderRadius="50%"
                bgColor={selected_ns_uid === ns.uid ? '#47C8BF' : '#ABADC3'}
              />
              <Text
                fontSize={'12px'}
                {...(selected_ns_uid === ns.uid
                  ? {
                      color: '#0884DD'
                    }
                  : {})}
                textTransform={'capitalize'}
              >
                {ns.teamName}
              </Text>
            </Flex>
            <Flex
              ml="auto"
              className="namespace-option"
              display={ns.uid === selected_ns_uid ? 'flex' : 'none'}
              position={'absolute'}
              right={'0'}
            >
              {ns.nstype === NSType.Team && (
                <InviteMember ownRole={ns.role} mr="10px" ns_uid={ns.uid} />
              )}
              <Box onClick={() => copyData(ns.id)} cursor={'pointer'} mr="6px">
                <Iconfont iconName="icon-copy2" width={14} height={14} color="#7B838B"></Iconfont>
              </Box>
            </Flex>
          </Flex>
        ))}
    </Box>
  );
};

export default NsList;
