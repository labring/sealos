// import SigninComponent from '@/components/signin';
import { useConfigStore } from '@/stores/config';
import { ensureLocaleCookie } from '@/utils/ssrLocale';
import { Box } from '@chakra-ui/react';
import { QueryClient, dehydrate } from '@tanstack/react-query';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Script from 'next/script';
import useScriptStore from '@/stores/script';
import SignLayout from '@/components/v2/SignLayout';
import SigninComponent from '@/components/v2/Sign';
import { useSemParams } from '@/hooks/useSemParams';
import { setAdClickData, setUserSemData } from '@/utils/sessionConfig';
import { setPendingOauth2RequestId } from '@/utils/oauth2';

export default function SigninPage() {
  const { layoutConfig, authConfig } = useConfigStore();
  const { setCaptchaIsLoad } = useScriptStore();
  const router = useRouter();

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

  useEffect(() => {
    if (!router.isReady) return;
    const requestId =
      typeof router.query.oauth2_request_id === 'string' ? router.query.oauth2_request_id : '';
    if (requestId) {
      setPendingOauth2RequestId(requestId);
    }
  }, [router.isReady, router.query.oauth2_request_id]);

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
