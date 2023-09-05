import useAuthList from '@/components/signin/auth/useAuthList';
import useCustomError from '@/components/signin/auth/useCustomError';
import Language from '@/components/signin/auth/useLanguage';
import usePassword from '@/components/signin/auth/usePassword';
import useProtocol from '@/components/signin/auth/useProtocol';
import useSms from '@/components/signin/auth/useSms';
import request from '@/services/request';
import { ApiResp, LoginType, SystemEnv } from '@/types';
import {
  Box,
  Button,
  Flex,
  Img,
  Tab,
  TabIndicator,
  TabList,
  Tabs,
  useDisclosure
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { debounce } from 'lodash';
import { useTranslation } from 'next-i18next';
import Head from 'next/head';
import sealosTitle from 'public/images/sealos-title.png';
import { useEffect, useMemo, useState } from 'react';

export default function SigninComponent() {
  const { data: platformEnv } = useQuery(['getPlatformEnv'], () =>
    request<any, ApiResp<SystemEnv>>('/api/platform/getEnv')
  );

  const {
    wechat_client_id = '',
    github_client_id = '',
    callback_url = '',
    service_protocol = '',
    private_protocol = '',
    needPassword = false,
    needSms = false,
    needGithub = false,
    needWechat = false
  } = platformEnv?.data || {};

  const needTabs = needPassword && needSms;

  const disclosure = useDisclosure();
  const { t, i18n } = useTranslation();
  const [tabIndex, setTabIndex] = useState<LoginType>(LoginType.NONE);

  const { ErrorComponent, showError } = useCustomError();

  const { Protocol, isAgree, setIsInvalid } = useProtocol({ service_protocol, private_protocol });
  const { SmsModal, login: smsSubmit, isLoading: smsLoading } = useSms({ showError });
  const {
    PasswordComponent,
    userExist,
    pageState,
    login: passwordSubmit,
    isLoading: passwordLoading
  } = usePassword({ showError });
  const isLoading = useMemo(() => passwordLoading || smsLoading, [passwordLoading, smsLoading]);

  const { AuthList } = useAuthList({
    needGithub,
    needWechat,
    wechat_client_id,
    github_client_id,
    callback_url
  });

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
      [LoginType.NONE]: null
    };
  }, [PasswordComponent, SmsModal, passwordSubmit, smsSubmit]);

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
      backgroundImage={'url(/images/background.svg)'}
      backgroundRepeat={'no-repeat'}
      backgroundSize={'cover'}
    >
      <Head>
        <title>sealos Cloud</title>
        <meta name="description" content="sealos cloud dashboard" />
      </Head>
      <Flex h="full" w="full" flexDir={'column'} justifyContent={'center'} alignItems={'center'}>
        <Box mb="36px">
          <Img src={sealosTitle.src} w="135px"></Img>
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
              onChange={(idx) => setTabIndex(idx)}
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
              </TabList>
              <TabIndicator mt="-2px" height="2px" bg="#FFFFFF" borderRadius="1px" />
            </Tabs>
          )}

          {LoginComponent}

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
        </Flex>
      </Flex>
      <Language disclosure={disclosure} i18n={i18n} />
    </Box>
  );
}
