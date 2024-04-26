import { Box, Divider, HStack, Text, useDisclosure, VStack } from '@chakra-ui/react';
import { ExchangeIcon } from '@sealos/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import useSessionStore from '@/stores/session';
import { useRouter } from 'next/router';
import { nsListRequest, switchRequest } from '@/api/namespace';
import { sessionConfig } from '@/utils/sessionConfig';
import { NSType } from '@/types/team';
import TeamCenter from '@/components/team/TeamCenter';
import NsListItem from '@/components/team/NsListItem';
import useAppStore from '@/stores/app';
import { jwtDecode } from 'jwt-decode';
import { AccessTokenPayload } from '@/types/token';
import { switchKubeconfigNamespace } from '@/utils/switchKubeconfigNamespace';

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
        console.log(payload, session);
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
    <HStack position={'relative'}>
      <HStack
        borderRadius={'10px'}
        p={'8px 12px'}
        justifyContent={'space-between'}
        background={'rgba(244, 246, 248, 0.6)'}
        boxShadow={'0px 1px 2px rgba(0, 0, 0, 0.2)'}
        fontSize={'13px'}
        color={'#152539'}
        fontWeight={'500'}
        minW={'166px'}
        backdropFilter={'blur(8px)'}
        onClick={() => disclosure.onOpen()}
      >
        <Text>
          {namespace?.nstype === NSType.Private ? t('Default Team') : namespace?.teamName}
        </Text>
        <ExchangeIcon />
      </HStack>
      {disclosure.isOpen ? (
        <>
          <Box
            position={'fixed'}
            inset={0}
            zIndex={'998'}
            onClick={(e) => {
              e.stopPropagation();
              disclosure.onClose();
            }}
          />
          <Box position={'absolute'} inset={0} zIndex={'999'} fontSize={'13px'}>
            <Box
              bgColor={'red'}
              bg="rgba(255, 255, 255, 0.8)"
              boxShadow={'0px 1px 2px rgba(0, 0, 0, 0.2)'}
              position={'absolute'}
              top="43px"
              right={0}
              left={0}
              cursor={'initial'}
              borderRadius={'8px'}
              p="6px"
              backdropFilter={'blur(150px)'}
            >
              <VStack gap={0} alignItems={'stretch'}>
                <TeamCenter />
                <Divider bgColor={'rgba(0, 0, 0, 0.1)'} my={'4px'} h={'1px'} />
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
        </>
      ) : null}
    </HStack>
  );
}
