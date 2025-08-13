import { useConfigStore } from '@/stores/config';
import { Box, Flex, Img, useDisclosure, VStack } from '@chakra-ui/react';
import Head from 'next/head';
import { useEffect } from 'react';
import Script from 'next/script';
import useScriptStore from '@/stores/script';
import bgimage from 'public/images/signin_bg.png';
import bgimageZh from 'public/images/signin_bg_zh.png';
import LangSelectSimple from '../LangSelect/simple';
import InviterPop from './InviterPop';
import { useTranslation } from 'next-i18next';
import useSessionStore from '@/stores/session';
import { useRouter } from 'next/router';
import { useLanguageSwitcher } from '@/hooks/useLanguageSwitcher';
import { GitHubReauthPromptModal } from './GitHubReauthPromptModal';

export default function SignLayout({ children }: { children: React.ReactNode }) {
  useLanguageSwitcher(); // force set language
  const { i18n } = useTranslation();
  const { layoutConfig, authConfig } = useConfigStore();
  const { setCaptchaIsLoad } = useScriptStore();
  const { session, token, signinPageAction, setSigninPageAction } = useSessionStore();
  const router = useRouter();

  useEffect(() => {
    const url = sessionStorage.getItem('accessTemplatesNoLogin');
    if (!!url) {
      sessionStorage.clear();
      window.location.replace(url);
    }
  }, []);

  useEffect(() => {
    if (session && token) {
      router.replace('/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    isOpen: isGitHubReauthPromptOpen,
    onOpen: onGitHubReauthPromptOpen,
    onClose: onGitHubReauthPromptClose
  } = useDisclosure();
  // Execute page actions
  useEffect(() => {
    if (signinPageAction === 'PROMPT_REAUTH_GITHUB') {
      onGitHubReauthPromptOpen();
      setSigninPageAction(null);
    }
  }, [signinPageAction, setSigninPageAction, onGitHubReauthPromptOpen]);
  return (
    <Box>
      <Head>
        <title>{layoutConfig?.meta.title}</title>
        <meta name="description" content={layoutConfig?.meta.description} />
      </Head>
      {authConfig?.captcha.enabled && (
        <Script
          src="https://o.alicdn.com/captcha-frontend/aliyunCaptcha/AliyunCaptcha.js"
          onLoad={() => {
            setCaptchaIsLoad();
          }}
        />
      )}
      {/* {layoutConfig?.meta.scripts?.map((item, i) => {
        return <Script key={i} {...item} />;
      })} */}
      <Flex width={'full'}>
        <Img
          objectFit={'cover'}
          src={i18n.language === 'zh' ? bgimageZh.src : bgimage.src}
          alt="signin-bg"
          fill={'cover'}
          w={'50%'}
          display={{ base: 'none', md: 'block' }}
        />

        <VStack w="full" position={'relative'}>
          <Flex alignSelf={'flex-end'} gap={'8px'} mr={'20px'} mt={'22px'} position={'absolute'}>
            <GitHubReauthPromptModal
              isOpen={isGitHubReauthPromptOpen}
              onClose={onGitHubReauthPromptClose}
            />
            {layoutConfig?.version === 'cn' && <InviterPop />}
            {layoutConfig?.version === 'cn' && <LangSelectSimple />}
          </Flex>
          {children}
        </VStack>
      </Flex>
    </Box>
  );
}
