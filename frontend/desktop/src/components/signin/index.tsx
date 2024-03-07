import AuthList from '@/components/signin/auth/AuthList';
import { getSystemEnv, uploadConvertData } from '@/api/platform';
import useCustomError from '@/components/signin/auth/useCustomError';
import Language from '@/components/signin/auth/useLanguage';
import usePassword from '@/components/signin/auth/usePassword';
import useProtocol from '@/components/signin/auth/useProtocol';
import useSms from '@/components/signin/auth/useSms';
import { BackgroundImageUrl, useSystemConfigStore } from '@/stores/config';
import useSessionStore from '@/stores/session';
import { LoginType } from '@/types';
import {
  Box,
  Button,
  Flex,
  Tab,
  TabIndicator,
  TabList,
  Tabs,
  Text,
  useDisclosure
} from '@chakra-ui/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { debounce } from 'lodash';
import { useTranslation } from 'next-i18next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import useWechat from './auth/useWechat';

export default function SigninComponent() {
  const { data: platformEnv } = useQuery(['getPlatformEnv'], getSystemEnv);
  const { systemConfig } = useSystemConfigStore();
  const {
    service_protocol_zh = '',
    private_protocol_zh = '',
    service_protocol_en = '',
    private_protocol_en = '',
    needPassword = false,
    needSms = false,
    openWechatEnabled = false
  } = platformEnv?.data || {};
  const needTabs = needPassword && needSms;
  const disclosure = useDisclosure();
  const { t, i18n } = useTranslation();
  const [tabIndex, setTabIndex] = useState<LoginType>(LoginType.NONE);

  const { ErrorComponent, showError } = useCustomError();
  let protocol_data: Parameters<typeof useProtocol>[0];
  if (['zh', 'zh-Hans'].includes(i18n.language))
    protocol_data = {
      service_protocol: service_protocol_zh,
      private_protocol: private_protocol_zh
    };
  else
    protocol_data = {
      service_protocol: service_protocol_en,
      private_protocol: private_protocol_en
    };
  const { Protocol, isAgree, setIsInvalid } = useProtocol(protocol_data!);
  const { WechatComponent, login: wechatSubmit } = useWechat();
  const { SmsModal, login: smsSubmit, isLoading: smsLoading } = useSms({ showError });
  const {
    PasswordComponent,
    pageState,
    login: passwordSubmit,
    isLoading: passwordLoading
  } = usePassword({ showError });
  const isLoading = useMemo(() => passwordLoading || smsLoading, [passwordLoading, smsLoading]);
  const isSignIn = useSessionStore((s) => s.isUserLogin);
  const delSession = useSessionStore((s) => s.delSession);
  const setToken = useSessionStore((s) => s.setToken);
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    if (isSignIn()) {
      router.replace('/');
    } else {
      queryClient.clear();
      delSession();
      setToken('');
    }
  }, []);

  const loginConfig = useMemo(() => {
    return {
      [LoginType.SMS]: {
        login: smsSubmit,
        component: <SmsModal />
      },
      [LoginType.PASSWORD]: {
        login: passwordSubmit,
        component: <PasswordComponent />
      },
      [LoginType.WeChat]: {
        login: wechatSubmit,
        component: <WechatComponent />
      },
      [LoginType.NONE]: null
    };
  }, [PasswordComponent, SmsModal, WechatComponent, passwordSubmit, smsSubmit, wechatSubmit]);

  useEffect(() => {
    setTabIndex(needSms ? LoginType.SMS : needPassword ? LoginType.PASSWORD : LoginType.NONE);
  }, [needPassword, needSms]);

  const LoginComponent = useMemo(
    () => (tabIndex !== LoginType.NONE ? loginConfig[tabIndex].component : null),
    [loginConfig, tabIndex]
  );

  const handleLogin = debounce(() => {
    const selectedConfig = loginConfig[tabIndex];
    if (isAgree && selectedConfig) {
      const { login } = selectedConfig;
      login();
      uploadConvertData([3])
        .then((res) => {
          console.log(res);
        })
        .catch((err) => {
          console.log(err);
        });
    } else {
      setIsInvalid(true);
      showError(t('Read and agree'));
    }
  }, 500);

  return (
    <Box
      position={'relative'}
      overflow={'hidden'}
      w="100vw"
      h="100vh"
      backgroundImage={`url(${BackgroundImageUrl})`}
      backgroundRepeat={'no-repeat'}
      backgroundSize={'cover'}
    >
      <Head>
        <title>{systemConfig?.metaTitle}</title>
        <meta name="description" content={systemConfig?.metaDescription} />
      </Head>
      <Flex h="full" w="full" flexDir={'column'} justifyContent={'center'} alignItems={'center'}>
        <Box mb="36px">
          <Text
            color={'#FFF'}
            fontSize={'44px'}
            fontWeight={700}
            textShadow={'0px 2px 6px rgba(0, 0, 0, 0.30)'}
          >
            {systemConfig?.title}
          </Text>
        </Box>
        <Flex
          p="30px 48px"
          boxShadow="0px 15px 20px rgba(0, 0, 0, 0.2)"
          backdropFilter="blur(100px)"
          borderRadius="12px"
          flexDir="column"
          justifyContent="center"
          align="center"
          position={'relative'}
        >
          <ErrorComponent />

          {pageState === 0 && needTabs && (
            <Tabs
              index={tabIndex}
              onChange={(idx) => {
                if (idx === LoginType.WeChat) {
                  wechatSubmit();
                }
                setTabIndex(idx);
              }}
              variant="unstyled"
              p={'0'}
              width={'full'}
            >
              <TabList
                borderBottom={'2px solid rgba(255, 255, 255, 0.3)'}
                p={'0'}
                fontSize={'16px'}
                fontWeight={'500'}
                fontFamily={'PingFang SC'}
                color={'rgba(255, 255, 255, 0.3)'}
                gap={'20px'}
              >
                <Tab px="0" _selected={{ color: 'white' }}>
                  {t('Verification Code Login')}
                </Tab>
                <Tab px="0" _selected={{ color: 'white' }}>
                  {t('Password Login')}
                </Tab>
                {openWechatEnabled && (
                  <Tab px="0" _selected={{ color: 'white' }}>
                    {t('Official account login')}
                  </Tab>
                )}
              </TabList>
              <TabIndicator mt="-2px" height="2px" bg="#FFFFFF" borderRadius="1px" />
            </Tabs>
          )}

          {LoginComponent}

          {tabIndex !== LoginType.WeChat && (
            <>
              <Protocol />
              <Button
                variant={'unstyled'}
                background="linear-gradient(90deg, #000000 0%, rgba(36, 40, 44, 0.9) 98.29%)"
                boxShadow="0px 4px 4px rgba(0, 0, 0, 0.25)"
                color="#fff"
                display={'flex'}
                justifyContent={'center'}
                alignItems={'center'}
                type="submit"
                _hover={{
                  opacity: '0.85'
                }}
                width="266px"
                minH="42px"
                mb="14px"
                borderRadius="4px"
                p="10px"
                onClick={handleLogin}
              >
                {isLoading ? (t('Loading') || 'Loading') + '...' : t('Log In') || 'Log In'}
              </Button>
              <AuthList />
            </>
          )}
        </Flex>
      </Flex>
      <Language disclosure={disclosure} i18n={i18n} />
    </Box>
  );
}
