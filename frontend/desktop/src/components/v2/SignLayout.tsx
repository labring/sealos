'use client';

import { useConfigStore } from '@/stores/config';
import { Box, Flex, useDisclosure, VStack } from '@chakra-ui/react';
import { useEffect, useState, useMemo, useRef } from 'react';
import bgimage from 'public/images/signin_bg.png';
import bgimageZh from 'public/images/signin_bg_zh.png';
import LangSelectSimple from '../LangSelect/simple';
import { useTranslation } from 'next-i18next';
import useSessionStore from '@/stores/session';
import useSigninPageStore from '@/stores/signinPageStore';
import { useRouter } from 'next/router';
import { useLanguageSwitcher } from '@/hooks/useLanguageSwitcher';
import { GitHubReauthPrompt } from './GitHubReauthPrompt';

export default function SignLayout({ children }: { children: React.ReactNode }) {
  useLanguageSwitcher(); // force set language
  const { i18n } = useTranslation();
  const { layoutConfig, authConfig, isLoaded } = useConfigStore();
  const { session, token } = useSessionStore();
  const { signinPageAction, setSigninPageAction, clearSigninPageAction } = useSigninPageStore();
  const router = useRouter();
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (session?.user && !session?.isGuest && !!token) {
      router.replace('/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    isOpen: isGitHubReauthPromptOpen,
    onOpen: onGitHubReauthPromptOpen,
    onClose: onGitHubReauthPromptClose
  } = useDisclosure();

  // Execute page actions (only on client side)
  useEffect(() => {
    if (signinPageAction === 'PROMPT_REAUTH_GITHUB') {
      onGitHubReauthPromptOpen();
    }
  }, [signinPageAction, onGitHubReauthPromptOpen, setSigninPageAction, clearSigninPageAction]);

  const backgroundImageSrc = useMemo(() => {
    if (!isLoaded) return null;

    const isZh = i18n.language === 'zh';
    const customImage = layoutConfig?.authBackgroundImage;

    if (customImage) {
      return isZh ? customImage.zh : customImage.en;
    }

    return isZh ? bgimageZh.src : bgimage.src;
  }, [i18n.language, layoutConfig?.authBackgroundImage, isLoaded]);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      setImageLoaded(true);
    }
  }, [backgroundImageSrc]);

  return (
    <Box>
      <Flex width={'full'}>
        {backgroundImageSrc ? (
          <Box
            ref={imgRef}
            as="img"
            src={backgroundImageSrc}
            alt="signin-bg"
            objectFit={'cover'}
            w={'50%'}
            display={{ base: 'none', md: 'block' }}
            opacity={imageLoaded ? 1 : 0}
            transition="opacity 0.3s ease-in-out"
            onLoad={() => {
              setImageLoaded(true);
            }}
          />
        ) : (
          <Box w={'50%'} display={{ base: 'none', md: 'block' }} />
        )}

        <VStack w="full" position={'relative'}>
          <Flex alignSelf={'flex-end'} gap={'8px'} mr={'20px'} mt={'22px'} position={'absolute'}>
            <GitHubReauthPrompt
              isOpen={isGitHubReauthPromptOpen}
              onClose={onGitHubReauthPromptClose}
            />
            {layoutConfig?.version === 'cn' && <LangSelectSimple />}
          </Flex>
          {children}
        </VStack>
      </Flex>
    </Box>
  );
}
