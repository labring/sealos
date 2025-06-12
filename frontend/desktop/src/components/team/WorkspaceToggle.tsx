import { nsListRequest, switchRequest } from '@/api/namespace';
import NsListItem from '@/components/team/NsListItem';
import TeamCenter from '@/components/team/TeamCenter';
import useSessionStore from '@/stores/session';
import { NSType } from '@/types/team';
import { AccessTokenPayload } from '@/types/token';
import { sessionConfig } from '@/utils/sessionConfig';
import { switchKubeconfigNamespace } from '@/utils/switchKubeconfigNamespace';
import { Box, Center, Divider, Flex, HStack, Text, VStack, useDisclosure } from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { jwtDecode } from 'jwt-decode';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { ChevronDown, Plus } from 'lucide-react';
import CreateTeam from './CreateTeam';
import BoringAvatar from 'boring-avatars';

export default function WorkspaceToggle() {
  const disclosure = useDisclosure();
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

  const closeWorkspaceToggle = () => {
    disclosure.onClose();
  };

  return (
    <HStack position={'relative'}>
      <HStack
        height={'36px'}
        onClick={() => {
          disclosure.onOpen();
        }}
        cursor={'pointer'}
        userSelect={'none'}
        gap={'8px'}
        _hover={{
          bg: 'secondary'
        }}
        borderRadius={'8px'}
        pl={'12px'}
        pr={'8px'}
        bg={disclosure.isOpen ? 'secondary' : ''}
      >
        {namespace?.id && (
          <Box boxSize={'24px'}>
            <BoringAvatar
              size={24}
              name={namespace?.id}
              colors={['#ff9e9e', '#b4f8cc', '#4294ff', '#ffe5f0', '#03e2db']}
            />
          </Box>
        )}
        <Text color={'primary'} fontSize={'14px'} fontWeight={'500'} textTransform={'capitalize'}>
          {namespace?.teamName}
          {/* {namespace?.nstype === NSType.Private ? t('common:default_team') : namespace?.teamName} */}
        </Text>
        <Center
          transform={disclosure.isOpen ? 'rotate(-90deg)' : 'rotate(0deg)'}
          borderRadius={'4px'}
          transition={'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'}
        >
          <ChevronDown size={16} color={'#525252'} />
        </Center>
      </HStack>
      {disclosure.isOpen ? (
        <Box position={'absolute'} w={'full'} minW={'274px'}>
          <Box
            position={'fixed'}
            inset={0}
            zIndex={'998'}
            onClick={(e) => {
              e.stopPropagation();
              disclosure.onClose();
            }}
          ></Box>
          <Box position={'absolute'} inset={0} zIndex={999} fontSize={'13px'}>
            <Box
              position={'absolute'}
              top="24px"
              right={0}
              left={0}
              cursor={'initial'}
              // maxH={'300px'}
              // overflow={'auto'}
              borderRadius={'12px'}
              py={'8px'}
              border={'0.5px solid #E4E4E7'}
              background={'#FFF'}
              boxShadow={
                '0px 20px 25px -5px rgba(0, 0, 0, 0.10), 0px 10px 10px -5px rgba(0, 0, 0, 0.04)'
              }
              color={'#18181B'}
              style={{
                scrollbarWidth: 'none'
              }}
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
              <CreateTeam>
                <Flex
                  alignItems={'center'}
                  gap={'8px'}
                  px={'16px'}
                  py={'6px'}
                  height={'40px'}
                  cursor={'pointer'}
                >
                  <Plus size={20} color="#71717A" />
                  <Text fontSize="14px" fontWeight="400" color="#18181B">
                    {t('common:create_workspace')}
                  </Text>
                </Flex>
              </CreateTeam>
              <Divider my={'4px'} borderColor={'#F4F4F5'} />
              <TeamCenter closeWorkspaceToggle={closeWorkspaceToggle} />
            </Box>
          </Box>
        </Box>
      ) : null}
    </HStack>
  );
}
