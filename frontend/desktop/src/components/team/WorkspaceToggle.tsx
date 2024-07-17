import { nsListRequest, switchRequest } from '@/api/namespace';
import NsListItem from '@/components/team/NsListItem';
import TeamCenter from '@/components/team/TeamCenter';
import useAppStore from '@/stores/app';
import useSessionStore from '@/stores/session';
import { NSType } from '@/types/team';
import { AccessTokenPayload } from '@/types/token';
import { sessionConfig } from '@/utils/sessionConfig';
import { switchKubeconfigNamespace } from '@/utils/switchKubeconfigNamespace';
import { Box, Divider, HStack, Text, VStack, useDisclosure } from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { jwtDecode } from 'jwt-decode';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { CubeIcon, DesktopExchangeIcon } from '../icons';

export default function WorkspaceToggle() {
  const disclosure = useDisclosure();
  const { setWorkSpaceId, session } = useSessionStore();
  const { t } = useTranslation();
  const ns_uid = session?.user?.ns_uid || '';
  const router = useRouter();
  const queryClient = useQueryClient();
  const { init } = useAppStore();
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

  const defaultNamespace = namespaces.find((x) => x.nstype === NSType.Private);

  if (!namespace && defaultNamespace && namespaces.length > 0) {
    // will be deleted
    switchTeam({ uid: defaultNamespace.uid });
  }
  return (
    <HStack position={'relative'} mt={'8px'}>
      <HStack
        w={'234px'}
        height={'40px'}
        borderRadius={'100px'}
        p={'8px 12px'}
        background={'rgba(255, 255, 255, 0.07)'}
        _hover={{
          background: 'rgba(255, 255, 255, 0.15)'
        }}
        fontSize={'12px'}
        color={'white'}
        fontWeight={'500'}
        onClick={() => {
          disclosure.onOpen();
        }}
        cursor={'pointer'}
        userSelect={'none'}
      >
        <CubeIcon />
        <Text>
          {namespace?.nstype === NSType.Private ? t('common:default_team') : namespace?.teamName}
        </Text>
        <DesktopExchangeIcon ml={'auto'} />
      </HStack>
      {disclosure.isOpen ? (
        <Box position={'absolute'} w={'full'}>
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
              color={'white'}
              bg="rgba(220, 220, 224, 0.10)"
              boxShadow={'0px 1.167px 2.333px 0px rgba(0, 0, 0, 0.20)'}
              position={'absolute'}
              top="24px"
              right={0}
              left={0}
              cursor={'initial'}
              borderRadius={'8px'}
              p="6px"
              backdropFilter={'blur(50px)'}
              maxH={'300px'}
              overflow={'auto'}
              style={{
                scrollbarWidth: 'none'
              }}
            >
              <VStack gap={0} alignItems={'stretch'}>
                <TeamCenter />
                {/* <Divider bgColor={'rgba(0, 0, 0, 0.05)'} my={'4px'} h={'0px'} /> */}
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
                    />
                  );
                })}
              </VStack>
            </Box>
          </Box>
        </Box>
      ) : null}
    </HStack>
  );
}
