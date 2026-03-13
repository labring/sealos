// import SigninComponent from '@/components/signin';
import { useConfigStore } from '@/stores/config';
import { compareFirstLanguages } from '@/utils/tools';
import { Box, useToast } from '@chakra-ui/react';
import { QueryClient, dehydrate } from '@tanstack/react-query';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';
import { useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import Script from 'next/script';
import useScriptStore from '@/stores/script';
import SignLayout from '@/components/v2/SignLayout';
import SigninComponent from '@/components/v2/Sign';
import { useSemParams } from '@/hooks/useSemParams';
import { setAdClickData, setUserSemData } from '@/utils/sessionConfig';

export default function SigninPage({ sessionExpired }: { sessionExpired?: boolean }) {
  const { layoutConfig, authConfig } = useConfigStore();
  const { setCaptchaIsLoad } = useScriptStore();
  const toast = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    const url = sessionStorage.getItem('accessTemplatesNoLogin');
    if (!!url) {
      sessionStorage.clear();
      window.location.replace(url);
    }
  }, []);

  useEffect(() => {
    if (sessionExpired) {
      toast({
        title: t('common:session_expired'),
        status: 'error',
        duration: null,
        isClosable: true,
        position: 'top'
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Grab params from ad clicks and store in local storage
  const { adClickData, semData } = useSemParams();
  useEffect(() => {
    if (adClickData) {
      setAdClickData(adClickData);
    }

    if (semData) {
      setUserSemData(semData);
    }
  });

  return (
    <Box>
      <Head>
        <title>{layoutConfig?.meta.title}</title>
        <meta name="description" content={layoutConfig?.meta.description} />
        <link rel="shortcut icon" href={layoutConfig?.logo ? layoutConfig?.logo : '/favicon.ico'} />
        <link rel="icon" href={layoutConfig?.logo ? layoutConfig?.logo : '/favicon.ico'} />
      </Head>
      {authConfig?.captcha.ali.enabled && (
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

  const sessionExpired = req?.cookies?.session_expired === '1';
  const cookies = [`NEXT_LOCALE=${local}; Max-Age=2592000; Secure; SameSite=None`];
  if (sessionExpired) {
    cookies.push('session_expired=; Path=/; Max-Age=0');
  }
  res.setHeader('Set-Cookie', cookies);

  const queryClient = new QueryClient();
  const props = {
    ...(await serverSideTranslations(local, undefined, null, locales || [])),
    dehydratedState: dehydrate(queryClient),
    sessionExpired
  };
  return {
    props
  };
}
