import {
  Box,
  Button,
  Divider,
  Input,
  Stack,
  Flex,
  useColorModeValue,
  Text,
  InputGroup,
  InputLeftElement
} from '@chakra-ui/react';
import useProtocol from '@/components/signin/auth/useProtocol';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'next-i18next';
import { zodResolver } from '@hookform/resolvers/zod';

import { useCustomToast } from '@/hooks/useCustomToast';
import { GoogleIcon, GithubIcon } from '../icons';
import { ILoginParams, loginParamsSchema } from '@/schema/auth';
import { useSignupStore } from '@/stores/signup';
import { useConfigStore } from '@/stores/config';
import useSessionStore from '@/stores/session';
import { OauthProvider } from '@/types/user';
import Link from 'next/link';
import { WechatIcon } from '@sealos/ui';
import { z } from 'zod';
import { gtmLoginStart } from '@/utils/gtm';

export default function SigninComponent() {
  const { t, i18n } = useTranslation();
  const { toast } = useCustomToast();
  const conf = useConfigStore();
  const [tabIndex, setTabIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();
  const needPhone = conf.authConfig?.idp.sms?.enabled && conf.authConfig.idp.sms.ali.enabled;
  const needEmail = conf.authConfig?.idp.email.enabled;
  const { setSignupData, signupData } = useSignupStore();
  const authConfig = conf.authConfig;
  const { generateState, setProvider, setToken, session, token } = useSessionStore();
  const {
    register: registerSignin,
    handleSubmit: handleSigninSubmit,
    formState: { errors: signinErrors }
  } = useForm<ILoginParams>({
    resolver: zodResolver(loginParamsSchema),
    mode: 'onChange'
  });
  let protocol_data: Parameters<typeof useProtocol>[0];
  if (['zh', 'zh-Hans'].includes(i18n.language))
    protocol_data = {
      service_protocol: conf.layoutConfig?.protocol?.serviceProtocol.zh as string,
      private_protocol: conf.layoutConfig?.protocol?.privateProtocol.zh as string
    };
  else
    protocol_data = {
      service_protocol: conf.layoutConfig?.protocol?.serviceProtocol.en as string,
      private_protocol: conf.layoutConfig?.protocol?.privateProtocol.en as string
    };
  const handleSocialLogin = async (provider: OauthProvider) => {
    gtmLoginStart();
    if (!authConfig) {
      console.error('Auth config not found');
      return;
    }

    const state = generateState();
    setProvider(provider);

    const oauthLogin = async ({ url }: { url: string }) => {
      window.location.href = url;
    };

    const oauthProxyLogin = async ({
      state,
      provider,
      proxyAddress,
      id
    }: {
      state: string;
      proxyAddress: string;
      provider: OauthProvider;
      id: string;
    }) => {
      const target = new URL(proxyAddress);
      const callback = new URL(authConfig.callbackURL);
      target.searchParams.append(
        'oauthProxyState',
        encodeURIComponent(callback.toString()) + '_' + state
      );
      target.searchParams.append('oauthProxyClientID', id);
      target.searchParams.append('oauthProxyProvider', provider);
      router.replace(target.toString());
    };

    try {
      switch (provider) {
        case 'WECHAT': {
          const wechatConf = authConfig.idp.wechat;
          if (!wechatConf) {
            throw new Error('wechat configuration not found');
          }
          if (wechatConf.proxyAddress) {
            await oauthProxyLogin({
              provider,
              state,
              proxyAddress: wechatConf.proxyAddress,
              id: wechatConf.clientID
            });
          } else {
            await oauthLogin({
              url: `https://open.weixin.qq.com/connect/qrconnect?appid=${wechatConf?.clientID}&redirect_uri=${authConfig.callbackURL}&response_type=code&state=${state}&scope=snsapi_login&#wechat_redirect`
            });
          }
          break;
        }
        case 'GITHUB': {
          const githubConf = authConfig.idp.github;
          if (!githubConf) {
            throw new Error('GitHub configuration not found');
          }
          if (githubConf.proxyAddress) {
            await oauthProxyLogin({
              provider,
              state,
              proxyAddress: githubConf.proxyAddress,
              id: githubConf.clientID
            });
          } else {
            await oauthLogin({
              url: `https://github.com/login/oauth/authorize?client_id=${githubConf.clientID}&redirect_uri=${authConfig.callbackURL}&scope=user:email%20read:user&state=${state}`
            });
          }
          break;
        }
        case 'GOOGLE': {
          const googleConf = authConfig.idp.google;
          if (!googleConf) {
            throw new Error('Google configuration not found');
          }
          const scope = encodeURIComponent(`profile openid email`);
          if (googleConf.proxyAddress) {
            await oauthProxyLogin({
              state,
              provider,
              proxyAddress: googleConf.proxyAddress,
              id: googleConf.clientID
            });
          } else {
            await oauthLogin({
              url: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleConf.clientID}&redirect_uri=${authConfig.callbackURL}&response_type=code&state=${state}&scope=${scope}&include_granted_scopes=true`
            });
          }
          break;
        }
      }
    } catch (error) {
      // console.error(`${provider} login error:`, error);
      // toast({
      //   title: t('cc:sign_in_failed'),
      //   description: error instanceof Error ? error.message : t('cc:unknown_error'),
      //   status: 'error',
      //   duration: 3000,
      //   isClosable: true,
      //   position: 'top'
      // });
    }
  };
  const bg = useColorModeValue('white', 'gray.700');

  return (
    <Flex minH="100vh" align="center" justify="center" bg={bg} direction={'column'}>
      <Stack mx="auto" maxW="lg" px={4} gap={'16px'} width="360px" minW={'352px'}>
        <Text fontSize={'24px'} fontWeight={600} mb={'16px'} mx="auto">
          {t('v2:workspace_welcome')}
        </Text>

        {conf.layoutConfig?.version === 'cn' ? (
          needPhone && (
            <>
              <InputGroup width={'full'}>
                <InputLeftElement color={'#71717A'} left={'12px'} h={'40px'}>
                  <Text
                    pl="10px"
                    pr="8px"
                    height={'20px'}
                    borderRight={'1px'}
                    fontSize={'14px'}
                    borderColor={'#E4E4E7'}
                  >
                    +86
                  </Text>
                </InputLeftElement>
                <Input
                  height="40px"
                  w="full"
                  fontSize={'14px'}
                  background="#FFFFFF"
                  border="1px solid #E4E4E7"
                  borderRadius="8px"
                  placeholder={t('phone')}
                  py="10px"
                  pr={'12px'}
                  pl={'60px'}
                  color={'#71717A'}
                  value={signupData?.providerId || ''}
                  onChange={(e) => {
                    setSignupData({
                      providerId: e.target.value,
                      providerType: 'PHONE'
                    });
                  }}
                />
              </InputGroup>
              <Button
                variant={'solid'}
                px={'0'}
                borderRadius={'8px'}
                onClick={() => {
                  const result = z
                    .string()
                    .regex(/^1[3-9]\d{9}$/, { message: 'Invalid phone number format' })
                    .safeParse(signupData?.providerId);
                  console.log(result);
                  if (result.error) {
                    toast({
                      title: result.error.errors[0].message,
                      status: 'error'
                    });
                    return;
                  }
                  if (signupData?.providerId) {
                    router.push('/phoneCheck');
                  }
                }}
                bgColor={'#0A0A0A'}
                rightIcon={<ArrowRight size={'14px'}></ArrowRight>}
              >
                {t('v2:sign_in')}
              </Button>
            </>
          )
        ) : conf.layoutConfig?.version === 'en' ? (
          needEmail && (
            <>
              <Input
                boxSize="border-box"
                display="flex"
                flexDirection="row"
                alignItems="center"
                padding="8px 12px"
                gap="4px"
                height="40px"
                background="#FFFFFF"
                border="1px solid #E4E4E7"
                borderRadius="8px"
                flex="none"
                order="0"
                placeholder={t('v2:email')}
                alignSelf="stretch"
                flexGrow="0"
                value={signupData?.providerId || ''}
                onChange={(e) => {
                  setSignupData({
                    providerId: e.target.value,
                    providerType: 'EMAIL'
                  });
                }}
              />
              <Button
                onClick={() => {
                  const result = z
                    .string()
                    .email({ message: 'Invalid email format' })
                    .safeParse(signupData?.providerId);
                  if (result.error) {
                    toast({
                      title: result.error.errors[0].message,
                      status: 'error'
                    });
                    return;
                  }
                  if (signupData?.providerId) {
                    gtmLoginStart();
                    router.push('/emailCheck');
                  }
                }}
                bgColor={'#0A0A0A'}
                borderRadius={'8px'}
                variant={'solid'}
                px={'0'}
                rightIcon={<ArrowRight size={'16px'}></ArrowRight>}
              >
                {t('v2:email_sign_in')}
              </Button>
            </>
          )
        ) : (
          <></>
        )}
        {((conf.layoutConfig?.version === 'cn' && needPhone) ||
          conf.layoutConfig?.version === 'en' ||
          needEmail) && (
          <Flex gap={'10px'} alignItems={'center'}>
            <Divider />
            <Flex justify="center" align="center" bg="white">
              <Text color="#71717A" fontSize="12px" width={'max-content'}>
                {t('v2:or')}
              </Text>
            </Flex>
            <Divider />
          </Flex>
        )}
        <Stack spacing={'16px'}>
          {authConfig?.idp.wechat?.enabled && (
            <Button
              borderRadius={'8px'}
              variant="outline"
              onClick={() => handleSocialLogin('WECHAT')}
              w={'100%'}
              leftIcon={<WechatIcon mr={0} />}
              display="flex"
              flexDirection="row"
              justifyContent="center"
              alignItems="center"
              padding="12px 16px"
              gap="8px"
              height="40px"
              // background="#0A0A0A"
            >
              {t('common:wechat')}
            </Button>
          )}
          {authConfig?.idp.github?.enabled && (
            <Button
              borderRadius={'8px'}
              variant="outline"
              onClick={() => handleSocialLogin('GITHUB' as OauthProvider)}
              w={'100%'}
              leftIcon={<GithubIcon mr={0} />}
              display="flex"
              flexDirection="row"
              justifyContent="center"
              alignItems="center"
              padding="12px 16px"
              // gap="8px"
              height="40px"
              // background="#0A0A0A"
            >
              GitHub
            </Button>
          )}
          {authConfig?.idp.google?.enabled && (
            <Button
              borderRadius={'8px'}
              variant="outline"
              onClick={() => handleSocialLogin('GOOGLE' as OauthProvider)}
              w={'100%'}
              leftIcon={<GoogleIcon mr={0} />}
              display="flex"
              flexDirection="row"
              justifyContent="center"
              alignItems="center"
              padding="12px 16px"
              // gap="8px"
              height="40px"
              // background="#0A0A0A"
            >
              Google
            </Button>
          )}
        </Stack>

        <Box
          mt={'8px'}
          fontSize="14px"
          color="gray.500"
          width={'full'}
          textAlign={'center'}
          mr="2px"
        >
          {t('v2:terms_and_privacy_policy_text')}{' '}
          <Box
            as={Link}
            href={protocol_data.service_protocol || ''}
            target="_blank"
            textDecoration="underline"
          >
            {t('v2:terms_and_conditions')}
          </Box>
          ,
          <Box
            as={Link}
            href={protocol_data.private_protocol || ''}
            target="_blank"
            textDecoration="underline"
          >
            {t('privacy_policy')}
          </Box>
        </Box>
      </Stack>
    </Flex>
  );
}
