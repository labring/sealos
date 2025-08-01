import { getInviteCodeInfoRequest, reciveAction, verifyInviteCodeRequest } from '@/api/namespace';
import useCallbackStore from '@/stores/callback';
import { useConfigStore } from '@/stores/config';
import useSessionStore from '@/stores/session';
import { ROLE_LIST, UserRole } from '@/types/team';
import { compareFirstLanguages } from '@/utils/tools';
import { Button, Flex, Image, Text, VStack } from '@chakra-ui/react';
import { track } from '@sealos/gtm';
import { dehydrate, QueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { isString } from 'lodash';
import type { NextPage } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const Callback: NextPage = () => {
  const router = useRouter();
  const { layoutConfig } = useConfigStore();
  const { token: curToken, session } = useSessionStore((s) => s);
  const { lastWorkSpaceId } = useSessionStore();
  const logo = useConfigStore().layoutConfig?.logo;
  const { setWorkspaceInviteCode } = useCallbackStore();
  const { t } = useTranslation();

  const inviteTips = ({ managerName, teamName, role }: Record<string, string>) =>
    t('common:receive_tips', {
      managerName,
      teamName,
      role
    });
  const inviteCode = router.query.code;
  useEffect(() => {
    if (!isString(inviteCode)) return;
    setWorkspaceInviteCode(inviteCode);
  }, [inviteCode]);

  const infoResp = useQuery({
    queryKey: [inviteCode],
    queryFn: () =>
      getInviteCodeInfoRequest({
        code: inviteCode as string
      }),
    enabled: isString(inviteCode)
  });

  const verifyMutation = useMutation({
    mutationFn: verifyInviteCodeRequest,
    onSuccess: (_data, variables) => {
      if (variables.action === reciveAction.Accepte) {
        track('workspace_join', {
          module: 'workspace',
          trigger: 'invite',
          role: infoResp?.data?.data!.role === UserRole.Manager ? 'manager' : 'developer'
        });
      }
    }
  });

  const reset = () => {
    setWorkspaceInviteCode();
    router.replace('/');
  };
  const isValid = !!(infoResp.isSuccess && infoResp.data?.data);
  const statusCode = infoResp.data?.code;
  const needLogin = statusCode === 401;
  useEffect(() => {
    if (needLogin) {
      router.replace('/');
      return;
    }
    if (statusCode === 204) {
      // already exist
      reset();
      return;
    }
    if (!isValid) {
      const tag = setTimeout(reset, 3000);
      return () => clearTimeout(tag);
    }
  }, [statusCode, isValid, router]);
  const acceptHandle = async () =>
    verifyMutation
      .mutateAsync({
        code: inviteCode as string,
        action: reciveAction.Accepte
      })
      .finally(() => {
        reset();
        return;
      });
  const cancelHandle = () => {
    if (!isValid) return;
    reset();
    return;
  };
  return (
    <Flex
      w={'full'}
      h={'full'}
      justify={'center'}
      align={'center'}
      onClick={cancelHandle}
      bgColor={'#F3F4F5'}
    >
      <VStack
        onClick={(e) => e.stopPropagation()}
        borderRadius={'16px'}
        w={'590px'}
        overflow={'hidden'}
        bgColor={'white'}
        boxShadow="0px 8px 29px 0px #BBC4CE40"
        h={'430px'}
      >
        <Flex
          alignSelf={'stretch'}
          py={'10px'}
          justifyContent={'center'}
          alignItems={'center'}
          bgColor={'grayModern.900'}
          color={'white'}
          gap={'8px'}
        >
          <Image boxSize={'34px'} borderRadius="full" src={logo} alt="logo" />
          <Text fontWeight={700} fontSize={'24px'}>
            {layoutConfig?.title ?? 'Sealos'}
          </Text>
        </Flex>
        {isValid ? (
          <VStack gap={'40px'} alignItems={'center'} flex={1}>
            <Text fontSize={'30px'} fontWeight={'600'} mt={'60px'}>
              {t('common:invitation_reminder')}
            </Text>
            <Text fontSize={'16px'} fontWeight={'400'} mb={'40px'} w={'330px'}>
              {inviteTips({
                managerName: infoResp.data.data!.inviterNickname,
                teamName: infoResp.data.data!.workspace,
                role: ROLE_LIST[infoResp.data.data!.role]
              })}
            </Text>
            <Button
              p={'8px 165px'}
              borderRadius={'64px'}
              disabled={infoResp.isSuccess || verifyMutation.isLoading}
              color={'#FEFEFE'}
              onClick={async (e) => {
                e.stopPropagation();
                await acceptHandle();
              }}
            >
              {t('common:accept_invitation')}
            </Button>
          </VStack>
        ) : infoResp.isError ? (
          <VStack alignItems={'center'} gap={'40px'} flex={1} justifyContent={'center'}>
            <Text fontSize={'30px'} fontWeight={'600'}>
              {t('common:invalid_invitation_link')}
            </Text>
            <Text fontSize={'16px'} fontWeight={'400'} maxW={'330px'}>
              {t('common:redirecting_to_homepage_in_3_seconds')}
            </Text>
          </VStack>
        ) : null}
      </VStack>
    </Flex>
  );
};
export async function getServerSideProps({ req, res, locales }: any) {
  const local =
    req?.cookies?.NEXT_LOCALE || compareFirstLanguages(req?.headers?.['accept-language'] || 'zh');
  res.setHeader('Set-Cookie', `NEXT_LOCALE=${local}; Max-Age=2592000; Secure; SameSite=None`);

  const queryClient = new QueryClient();
  const props = {
    ...(await serverSideTranslations(local, undefined, null, locales || [])),
    dehydratedState: dehydrate(queryClient)
  };
  return {
    props
  };
}
export default Callback;
