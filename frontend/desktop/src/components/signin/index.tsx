import AuthList from '@/components/signin/auth/AuthList';
import useCustomError from '@/components/signin/auth/useCustomError';
import Language from '@/components/signin/auth/useLanguage';
import usePassword from '@/components/signin/auth/usePassword';
import useProtocol from '@/components/signin/auth/useProtocol';
import useSms from '@/components/signin/auth/useSms';
import { useConfigStore } from '@/stores/config';
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
import { Turnstile, TurnstileInstance } from '@marsidev/react-turnstile';
import { useQueryClient } from '@tanstack/react-query';
import { debounce } from 'lodash';
import { useTranslation } from 'next-i18next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';
import useWechat from './auth/useWechat';
import { HiddenCaptchaComponent, TCaptchaInstance } from './Captcha';
import { captcha } from 'tencentcloud-sdk-nodejs';

export default function SigninComponent() {
  const conf = useConfigStore();
  const hasBaiduToken = conf.authConfig?.hasBaiduToken;
  const needPassword = conf.authConfig?.idp.password?.enabled;
  const needPhone = conf.authConfig?.idp.sms?.enabled && conf.authConfig.idp.sms.ali.enabled;
  const needTabsCount = 0 + (conf.authConfig?.idp.password?.enabled ? 1 : 0) + (needPhone ? 1 : 0);
  const disclosure = useDisclosure();
  const { t, i18n } = useTranslation();
  const [tabIndex, setTabIndex] = useState<LoginType>(LoginType.NONE);

  const { ErrorComponent, showError } = useCustomError();
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
  const turnstileRef = useRef<TurnstileInstance>(null);
  const captchaRef = useRef<TCaptchaInstance>(null);
  const loginConfig = useMemo(() => {
    return {
      [LoginType.SMS]: {
        login: smsSubmit,
        component: (
          <SmsModal
            onAfterGetCode={() => {
              turnstileRef.current?.reset();
              captchaRef.current?.reset();
            }}
            getCfToken={async () => {
              const token = await captchaRef.current?.getToken();
              const turnstiletoken = turnstileRef.current?.getResponse();
              return token;
            }}
          />
        )
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
  }, [
    PasswordComponent,
    SmsModal,
    WechatComponent,
    passwordSubmit,
    smsSubmit,
    wechatSubmit,
    turnstileRef.current
  ]);

  useEffect(() => {
    setTabIndex(needPhone ? LoginType.SMS : needPassword ? LoginType.PASSWORD : LoginType.NONE);
  }, [needPassword, needPhone]);

  const LoginComponent = useMemo(
    () => (tabIndex !== LoginType.NONE ? loginConfig[tabIndex].component : null),
    [loginConfig, tabIndex]
  );

  const isAgreeCb = () => {
    if (isAgree) {
      return true;
    } else {
      setIsInvalid(true);
      showError(t('common:read_and_agree'));
      return false;
    }
  };
  const handleLogin = debounce(() => {
    const selectedConfig = loginConfig[tabIndex];
    if (!isAgreeCb() || !selectedConfig) return;
    selectedConfig.login();
  }, 500);
  return (
    <Box
      position={'relative'}
      overflow={'hidden'}
      w="100vw"
      h="100vh"
      backgroundImage={`url(${conf.layoutConfig?.backgroundImage || ''})`}
      backgroundRepeat={'no-repeat'}
      backgroundSize={'cover'}
    >
      <Head>
        <title>{conf.layoutConfig?.meta.title || ''}</title>
        <meta name="description" content={conf.layoutConfig?.meta.description} />
      </Head>

      <Flex h="full" w="full" flexDir={'column'} justifyContent={'center'} alignItems={'center'}>
        {needTabsCount > 0 && (
          <Box mb="36px">
            <Text
              color={'#FFF'}
              fontSize={'44px'}
              fontWeight={700}
              textShadow={'0px 2px 6px rgba(0, 0, 0, 0.30)'}
            >
              {conf.layoutConfig?.title}
            </Text>
          </Box>
        )}
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

          {pageState === 0 && needTabsCount > 1 && (
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
                  {t('common:verification_code_login')}
                </Tab>
                <Tab px="0" _selected={{ color: 'white' }}>
                  {t('common:password_login')}
                </Tab>
                {conf.authConfig?.idp.wechat.enabled && (
                  <Tab px="0" _selected={{ color: 'white' }}>
                    {t('common:official_account_login')}
                  </Tab>
                )}
              </TabList>
              <TabIndicator mt="-2px" height="2px" bg="#FFFFFF" borderRadius="1px" />
            </Tabs>
          )}

          {LoginComponent}
          {/* footer */}
          {tabIndex !== LoginType.WeChat &&
            (needTabsCount > 0 ? (
              <>
                <Protocol />
                {!!conf.commonConfig?.cfSiteKey && (
                  <Turnstile
                    options={{
                      size: 'invisible'
                    }}
                    ref={turnstileRef}
                    siteKey={conf.commonConfig?.cfSiteKey}
                  />
                )}
                {conf.authConfig?.captcha.enabled && <HiddenCaptchaComponent ref={captchaRef} />}
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
                  {isLoading
                    ? (t('common:loading') || 'Loading') + '...'
                    : t('common:log_in') || 'Log In'}
                </Button>
                <AuthList isAgreeCb={isAgreeCb} />
              </>
            ) : (
              <>
                <Text
                  color={'#FFF'}
                  fontSize={'36px'}
                  fontWeight={700}
                  mb={'24px'}
                  textShadow={'0px 2px 6px rgba(0, 0, 0, 0.30)'}
                >
                  {conf.layoutConfig?.title}
                </Text>
                <AuthList zeroTab isAgreeCb={isAgreeCb} />
                <Protocol />
              </>
            ))}
        </Flex>
      </Flex>
      <Language disclosure={disclosure} i18n={i18n} />
    </Box>
  );
}
