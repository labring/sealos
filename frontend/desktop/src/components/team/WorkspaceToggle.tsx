import { nsListRequest, switchRequest } from '@/api/namespace';
import NsListItem from '@/components/team/NsListItem';
import TeamCenter from '@/components/team/TeamCenter';
import useSessionStore from '@/stores/session';
import { NSType } from '@/types/team';
import { AccessTokenPayload } from '@/types/token';
import { sessionConfig } from '@/utils/sessionConfig';
import { switchKubeconfigNamespace } from '@/utils/switchKubeconfigNamespace';
import {
  Box,
  Center,
  Divider,
  Flex,
  HStack,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Text,
  VStack,
  useDisclosure
} from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { jwtDecode } from 'jwt-decode';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { ChevronDown, Plus, Settings } from 'lucide-react';
import CreateTeam from './CreateTeam';
import BoringAvatar from 'boring-avatars';

export default function WorkspaceToggle() {
  const modalDisclosure = useDisclosure();
  const createTeamDisclosure = useDisclosure();
  const { session } = useSessionStore();
  const { t } = useTranslation();
  const user = session?.user;
  const ns_uid = user?.ns_uid || '';
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: switchRequest,
    async onSuccess(data) {
      if (data.code === 200 && !!data.data && session) {
        const payload = jwtDecode<AccessTokenPayload>(data.data.token);
        await sessionConfig({
          ...data.data,
          kubeconfig: switchKubeconfigNamespace(session.kubeconfig, payload.workspaceId)
        });
        queryClient.clear();
        router.reload();
      } else {
        throw Error('session in invalid');
      }
    }
  });
  const switchTeam = async ({ uid }: { uid: string }) => {
    if (ns_uid !== uid && !mutation.isLoading) return mutation.mutateAsync(uid);
  };
  const { data } = useQuery({
    queryKey: ['teamList', 'teamGroup'],
    queryFn: nsListRequest
  });
  const namespaces = data?.data?.namespaces || [];
  const namespace = namespaces.find((x) => x.uid === ns_uid);

  return (
    <>
      <Popover placement="bottom-start" isLazy>
        {({ isOpen }) => (
          <>
            <PopoverTrigger>
              <HStack
                height={'36px'}
                cursor={'pointer'}
                userSelect={'none'}
                gap={'8px'}
                _hover={{
                  bg: 'secondary'
                }}
                borderRadius={'8px'}
                pl={'12px'}
                pr={'8px'}
                bg={isOpen ? 'secondary' : ''}
                minW={'0'}
                flex={'0 1 auto'}
                tabIndex={0}
              >
                {namespace?.id && (
                  <Box
                    flex={'0 0 auto'}
                    boxSize={{
                      base: '20px',
                      sm: '24px'
                    }}
                  >
                    <BoringAvatar
                      size={'100%'}
                      name={namespace?.id}
                      colors={['#ff9e9e', '#b4f8cc', '#4294ff', '#ffe5f0', '#03e2db']}
                    />
                  </Box>
                )}
                <Text
                  color={'primary'}
                  fontSize={'14px'}
                  fontWeight={'500'}
                  textTransform={'capitalize'}
                  flex={'0 1 auto'}
                  wordBreak={'break-all'}
                  minW={'2ch'}
                  overflow={'hidden'}
                  textOverflow={'ellipsis'}
                  whiteSpace={'nowrap'}
                >
                  {namespace?.teamName}
                </Text>
                <Center
                  transform={isOpen ? 'rotate(-90deg)' : 'rotate(0deg)'}
                  borderRadius={'4px'}
                  transition={'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'}
                >
                  <ChevronDown size={16} color={'#525252'} />
                </Center>
              </HStack>
            </PopoverTrigger>
            <PopoverContent w={'full'} minW={'274px'}>
              <PopoverBody
                cursor={'initial'}
                // maxH={'300px'}
                // overflow={'auto'}
                borderRadius={'12px'}
                p={'0'}
                py={'8px'}
                color={'#18181B'}
                style={{
                  scrollbarWidth: 'none'
                }}
                fontSize={'13px'}
              >
                <Text px={'12px'} py={'6px'} color={'#71717A'} fontSize={'12px'} fontWeight={'500'}>
                  {t('common:workspace')}
                </Text>
                <VStack gap={0} alignItems={'stretch'} maxH={'260px'} overflow={'scroll'}>
                  {namespaces.map((ns) => {
                    return (
                      <NsListItem
                        key={ns.uid}
                        width={'full'}
                        onClick={() => {
                          switchTeam({ uid: ns.uid });
                        }}
                        displayPoint={true}
                        id={ns.uid}
                        isPrivate={ns.nstype === NSType.Private}
                        isSelected={ns.uid === ns_uid}
                        teamName={ns.teamName}
                        teamAvatar={ns.id}
                        showCheck={true}
                        selectedColor={'rgba(0, 0, 0, 0.05)'}
                        fontSize={'14px'}
                      />
                    );
                  })}
                </VStack>

                <Flex
                  alignItems={'center'}
                  gap={'8px'}
                  px={'16px'}
                  py={'6px'}
                  height={'40px'}
                  cursor={'pointer'}
                  onClick={() => {
                    createTeamDisclosure.onOpen();
                  }}
                >
                  <Plus size={20} color="#71717A" />
                  <Text fontSize="14px" fontWeight="400" color="#18181B">
                    {t('common:create_workspace')}
                  </Text>
                </Flex>
                <Divider my={'4px'} borderColor={'#F4F4F5'} />

                {/* TeamCenter */}
                <HStack
                  fontSize={'14px'}
                  px={'8px'}
                  alignItems={'center'}
                  cursor={'pointer'}
                  borderRadius={'4px'}
                  onClick={() => {
                    // setMessageFilter([]);
                    modalDisclosure.onOpen();
                  }}
                  // {...props}
                >
                  <Center p={'6px 8px'} gap={'12px'}>
                    <Settings size={16} color={'#737373'} />
                    <Text>{t('common:manage_team')}</Text>
                  </Center>
                </HStack>
              </PopoverBody>
            </PopoverContent>
          </>
        )}
      </Popover>

      <TeamCenter isOpen={modalDisclosure.isOpen} onClose={modalDisclosure.onClose} />
      <CreateTeam isOpen={createTeamDisclosure.isOpen} onClose={createTeamDisclosure.onClose} />
    </>
  );
}
