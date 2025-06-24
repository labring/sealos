// import SigninComponent from '@/components/signin';
import { useConfigStore } from '@/stores/config';
import { compareFirstLanguages } from '@/utils/tools';
import { Box, Stack, VStack } from '@chakra-ui/react';
import { QueryClient, dehydrate } from '@tanstack/react-query';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';
import { useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import Script from 'next/script';
import useScriptStore from '@/stores/script';
import SignLayout from '@/components/v2/SignLayout';
import LangSelectSimple from '@/components/LangSelect/simple';
import SigninComponent from '@/components/v2/Sign';

export default function SigninPage() {
  const { layoutConfig, authConfig } = useConfigStore();
  const { t } = useTranslation();
  const { setCaptchaIsLoad } = useScriptStore();
  useEffect(() => {
    const url = sessionStorage.getItem('accessTemplatesNoLogin');
    if (!!url) {
      sessionStorage.clear();
      window.location.replace(url);
    }
  }, []);

  return (
    <Box>
      <Head>
        <title>{layoutConfig?.meta.title}</title>
        <meta name="description" content={layoutConfig?.meta.description} />
        <link rel="shortcut icon" href={layoutConfig?.logo ? layoutConfig?.logo : '/favicon.ico'} />
        <link rel="icon" href={layoutConfig?.logo ? layoutConfig?.logo : '/favicon.ico'} />
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

      <SignLayout>
        <SigninComponent />
      </SignLayout>
    </Box>
  );
}

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
