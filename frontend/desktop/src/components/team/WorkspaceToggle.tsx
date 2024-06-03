import { nsListRequest, switchRequest } from '@/api/namespace';
import NsListItem from '@/components/team/NsListItem';
import TeamCenter from '@/components/team/TeamCenter';
import useAppStore from '@/stores/app';
import useSessionStore from '@/stores/session';
import { NSType } from '@/types/team';
import { AccessTokenPayload } from '@/types/token';
import { sessionConfig } from '@/utils/sessionConfig';
import { switchKubeconfigNamespace } from '@/utils/switchKubeconfigNamespace';
import { Box, Divider, HStack, Icon, Text, useDisclosure, VStack } from '@chakra-ui/react';
import { ExchangeIcon } from '@sealos/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { jwtDecode } from 'jwt-decode';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useDesktopContext } from '../desktop_content/providers';

export default function WorkspaceToggle() {
  const desktopContext = useDesktopContext();
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
    <HStack position={'relative'} mt={'8px'}>
      <HStack
        w={'234px'}
        height={'40px'}
        borderRadius={'100px'}
        p={'8px 12px'}
        justifyContent={'space-between'}
        background={'rgba(255, 255, 255, 0.07)'}
        fontSize={'12px'}
        color={'white'}
        fontWeight={'500'}
        onClick={() => {
          disclosure.onOpen();
          desktopContext?.onOpen(() => {
            disclosure.onClose();
          });
        }}
      >
        <Text>
          {namespace?.nstype === NSType.Private ? t('Default Team') : namespace?.teamName}
        </Text>
        <Icon
          xmlns="http://www.w3.org/2000/svg"
          width="16px"
          height="17px"
          viewBox="0 0 16 17"
          fill="none"
        >
          <path
            d="M10.935 3.68196C11.1954 3.42161 11.6175 3.42161 11.8778 3.68196L14.5157 6.31981C14.5224 6.32649 14.529 6.3333 14.5355 6.34026C14.5882 6.39714 14.6292 6.46098 14.6584 6.52868C14.6935 6.60978 14.713 6.69923 14.713 6.79323C14.713 6.8865 14.6938 6.97529 14.6592 7.0559C14.6294 7.12556 14.5872 7.19117 14.5325 7.24936C14.5229 7.25957 14.513 7.26948 14.5028 7.27907C14.443 7.3353 14.3754 7.37842 14.3036 7.40842C14.2274 7.44032 14.1441 7.45849 14.0566 7.45981L14.0452 7.45989L4.31297 7.45989C3.94478 7.45989 3.6463 7.16142 3.6463 6.79323C3.6463 6.42504 3.94478 6.12656 4.31297 6.12656L12.4368 6.12656L10.935 4.62477C10.6747 4.36442 10.6747 3.94231 10.935 3.68196Z"
            fill="white"
            fillOpacity="0.8"
          />
          <path
            d="M1.5749 9.73548C1.63889 9.67148 1.71266 9.62322 1.7914 9.59068C1.86814 9.5589 1.95211 9.54104 2.04015 9.54024L2.04631 9.54021H11.7796C12.1478 9.54021 12.4463 9.83869 12.4463 10.2069C12.4463 10.5751 12.1478 10.8735 11.7796 10.8735L3.65578 10.8735L5.15757 12.3753C5.41792 12.6357 5.41792 13.0578 5.15757 13.3182C4.89723 13.5785 4.47512 13.5785 4.21477 13.3182L1.5756 10.679L1.56914 10.6725C1.50808 10.6099 1.46177 10.5383 1.43022 10.4621C1.39763 10.3835 1.37964 10.2973 1.37964 10.2069C1.37964 10.1166 1.39759 10.0305 1.43011 9.95197C1.46264 9.87324 1.51091 9.79947 1.5749 9.73548Z"
            fill="white"
            fillOpacity="0.8"
          />
        </Icon>
      </HStack>
      {disclosure.isOpen ? (
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
      ) : null}
    </HStack>
  );
}
