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
import { useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowRight, Phone } from 'lucide-react';
import { useTranslation } from 'next-i18next';

import { useCustomToast } from '@/hooks/useCustomToast';
import { GoogleIcon, GithubIcon } from '../icons';
import { useConfigStore } from '@/stores/config';
import useSessionStore from '@/stores/session';
import { OauthProvider } from '@/types/user';
import Link from 'next/link';
import { WechatIcon } from '@sealos/ui';
import { z } from 'zod';
import { gtmLoginStart } from '@/utils/gtm';
import UsernamePasswordSignin from './UsernamePasswordSignin';
import { EmailSigninForm } from './EmailSigninForm';
import { useSignupStore } from '@/stores/signup';
import { PhoneSigninForm } from './PhoneSigninForm';

export default function SigninComponent() {
  const { t, i18n } = useTranslation();
  const { toast } = useCustomToast();
  const conf = useConfigStore();
  const router = useRouter();
  const needPhone = conf.authConfig?.idp.sms?.enabled && conf.authConfig.idp.sms.ali.enabled;
  const needEmail = conf.authConfig?.idp.email.enabled;
  const passwordSigninEnabled = conf.authConfig?.idp.password?.enabled;
  const { setSignupData, signupData } = useSignupStore();
  const authConfig = conf.authConfig;
  const { generateState, setProvider } = useSessionStore();

  // State to control password login mode
  const [isPasswordMode, setIsPasswordMode] = useState(false);

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

    /**
     * Redirect to proxied OAuth2 initiator url.
     * @deprecated - Use `getProxiedOAuth2InitiatorUrl` from `utils/oauth2.ts` instead
     */
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

  // If in password mode, render the username/password signin component
  if (isPasswordMode) {
    return <UsernamePasswordSignin onBack={() => setIsPasswordMode(false)} />;
  }

  return (
    <Flex minH="100vh" align="center" justify="center" bg={bg} direction={'column'}>
      <Stack mx="auto" maxW="lg" px={4} gap={'16px'} width="360px" minW={'352px'}>
        <Text fontSize={'24px'} fontWeight={600} mb={'16px'} mx="auto">
          {t('v2:workspace_welcome')}
        </Text>

        {conf.layoutConfig?.version === 'cn' ? (
          needPhone && (
            <>
              <PhoneSigninForm />
            </>
          )
        ) : conf.layoutConfig?.version === 'en' ? (
          needEmail && <EmailSigninForm />
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
            {t('v2:privacy_policy')}
          </Box>
        </Box>

        {/* Username/Password Login Button */}
        {passwordSigninEnabled && (
          <>
            <Divider borderStyle={'dashed'} />

            <Button
              variant="link"
              onClick={() => setIsPasswordMode(true)}
              w={'100%'}
              color={'#0A0A0A'}
            >
              {t('v2:username_password_signin')}
            </Button>
          </>
        )}
      </Stack>
    </Flex>
  );
}
