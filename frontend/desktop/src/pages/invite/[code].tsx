import { useConfigStore } from '@/stores/config';
import useSessionStore from '@/stores/session';
import { ensureLocaleCookie } from '@/utils/ssrLocale';
import { acceptInviteCode, type InviteAcceptData } from '@/utils/invite';
import { Button, Flex, Image, Text, VStack } from '@chakra-ui/react';
import { QueryClient, dehydrate, useQuery } from '@tanstack/react-query';
import type { NextPage } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';

// 桌面客户端下载入口：先指向产品页，后续可改为部署配置下发
const DESKTOP_DOWNLOAD_URL = 'https://sealos.run/';

const InvitePage: NextPage = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const layoutConfig = useConfigStore((s) => s.layoutConfig);
  // 已登录用户只展示进入/下载引导，不绑定邀请关系（绑定只发生在注册事务内）
  const isLoggedIn = !!useSessionStore((s) => s.token);
  const logo = layoutConfig?.logo;
  const code = typeof router.query.code === 'string' ? router.query.code : '';

  // 挂载时调用 accept：校验邀请码并写邀请上下文 cookie（服务端保证只写一次）
  const acceptQuery = useQuery({
    queryKey: ['invite-accept', code],
    queryFn: () => acceptInviteCode(code),
    enabled: router.isReady && !!code,
    retry: false,
    staleTime: Infinity
  });

  const acceptData = acceptQuery.data?.data;
  // 无效/停用/活动不可用分别展示，均不阻断注册
  const invalidTitle = () => {
    switch (acceptData?.reason) {
      case 'disabled':
        return t('common:activity_invite_disabled');
      case 'unavailable':
        return t('common:activity_invite_unavailable');
      default:
        return t('common:activity_invite_invalid');
    }
  };

  const stepItems = [
    t('common:activity_invite_step_1'),
    t('common:activity_invite_step_2'),
    t('common:activity_invite_step_3'),
    t('common:activity_invite_step_4')
  ];

  return (
    <Flex
      w={'full'}
      minH={'100vh'}
      justify={'center'}
      align={'center'}
      bgColor={'#F3F4F5'}
      p={'16px'}
    >
      <VStack
        borderRadius={'16px'}
        w={'590px'}
        maxW={'full'}
        overflow={'hidden'}
        bgColor={'white'}
        boxShadow="0px 8px 29px 0px #BBC4CE40"
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

        {!acceptQuery.isSuccess && !acceptQuery.isError ? (
          <VStack
            alignItems={'center'}
            justifyContent={'center'}
            flex={1}
            minH={'430px'}
            gap={'24px'}
          >
            <Text fontSize={'22px'} fontWeight={600}>
              {t('common:activity_invite_loading')}
            </Text>
          </VStack>
        ) : acceptData?.valid ? (
          <VStack
            gap={'24px'}
            alignItems={'center'}
            flex={1}
            minH={'430px'}
            py={'40px'}
            px={'48px'}
          >
            <Text fontSize={'28px'} fontWeight={600}>
              {t('common:activity_invite_title')}
            </Text>
            <Text fontSize={'16px'} fontWeight={500} noOfLines={1}>
              {t('common:activity_invite_from', { inviter: acceptData.inviterNickname ?? '***' })}
            </Text>
            <VStack gap={'8px'} alignItems={'flex-start'} w={'full'}>
              <Text fontSize={'15px'} fontWeight={500}>
                {t('common:activity_invite_reward_both')}
              </Text>
              <Text fontSize={'15px'} color={'grayModern.600'}>
                {t('common:activity_invite_first_login_bonus')}
              </Text>
            </VStack>
            <VStack gap={'10px'} alignItems={'flex-start'} w={'full'} mt={'8px'}>
              <Text fontSize={'14px'} fontWeight={600}>
                {t('common:activity_invite_steps_title')}
              </Text>
              {stepItems.map((step, index) => (
                <Flex key={step} gap={'10px'} alignItems={'center'}>
                  <Flex
                    w={'22px'}
                    h={'22px'}
                    borderRadius={'full'}
                    bgColor={'grayModern.100'}
                    justifyContent={'center'}
                    alignItems={'center'}
                    flexShrink={0}
                  >
                    <Text fontSize={'12px'} fontWeight={600}>
                      {index + 1}
                    </Text>
                  </Flex>
                  <Text fontSize={'14px'}>{step}</Text>
                </Flex>
              ))}
            </VStack>

            <Flex flex={1} />

            {isLoggedIn ? (
              <VStack gap={'12px'} w={'full'}>
                <Text fontSize={'13px'} color={'grayModern.600'}>
                  {t('common:activity_invite_logged_in_hint')}
                </Text>
                <Flex gap={'12px'} w={'full'} justifyContent={'center'}>
                  <Button flex={1} borderRadius={'64px'} onClick={() => router.push('/')}>
                    {t('common:activity_invite_continue')}
                  </Button>
                  <Button
                    flex={1}
                    borderRadius={'64px'}
                    color={'#FEFEFE'}
                    bg={'grayModern.900'}
                    _hover={{ bg: 'grayModern.800' }}
                    as="a"
                    href={DESKTOP_DOWNLOAD_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('common:activity_invite_download')}
                  </Button>
                </Flex>
              </VStack>
            ) : (
              <Button
                w={'full'}
                borderRadius={'64px'}
                py={'12px'}
                color={'#FEFEFE'}
                bg={'grayModern.900'}
                _hover={{ bg: 'grayModern.800' }}
                onClick={() => router.push(`/signin?invite=${encodeURIComponent(code)}`)}
              >
                {t('common:activity_invite_cta')}
              </Button>
            )}
          </VStack>
        ) : (
          <VStack
            alignItems={'center'}
            justifyContent={'center'}
            flex={1}
            minH={'430px'}
            gap={'16px'}
            px={'48px'}
          >
            <Text fontSize={'26px'} fontWeight={600}>
              {invalidTitle()}
            </Text>
            <Text fontSize={'15px'} color={'grayModern.600'} textAlign={'center'}>
              {t('common:activity_invite_invalid_hint')}
            </Text>
            {!isLoggedIn && (
              <Button
                mt={'12px'}
                px={'48px'}
                borderRadius={'64px'}
                onClick={() => router.push('/signin')}
              >
                {t('common:activity_invite_register_only')}
              </Button>
            )}
          </VStack>
        )}
      </VStack>
    </Flex>
  );
};

export async function getServerSideProps({ req, res, locales }: any) {
  const local = ensureLocaleCookie({ req, res, defaultLocale: 'en' });

  const queryClient = new QueryClient();
  const props = {
    ...(await serverSideTranslations(local, undefined, null, locales || [])),
    dehydratedState: dehydrate(queryClient)
  };
  return {
    props
  };
}

export default InvitePage;
