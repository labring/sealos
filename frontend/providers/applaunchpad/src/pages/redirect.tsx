import { getAppByName } from '@/api/app';
import { DESKTOP_DOMAIN } from '@/store/static';
import { AppEditSyncedFields } from '@/types/app';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const RedirectPage = () => {
  const router = useRouter();

  useEffect(() => {
    const handleRedirect = (formData?: string) => {
      if (formData) {
        const parsedData: Partial<AppEditSyncedFields> = JSON.parse(decodeURIComponent(formData));
        const appName = parsedData?.appName;

        if (appName) {
          getAppByName(appName)
            .then((app) => {
              if (app.isPause) {
                router.replace({
                  pathname: '/app/detail',
                  query: { name: appName }
                });
              } else {
                router.replace({
                  pathname: '/app/edit',
                  query: { name: appName, formData }
                });
              }
            })
            .catch((err) => {
              router.replace({
                pathname: '/app/edit',
                query: { formData }
              });
            });
        } else {
          router.replace('/apps');
        }
      } else {
        router.replace('/apps');
      }
    };

    const handleUrlParams = () => {
      const { formData } = router.query as { formData?: string };
      handleRedirect(formData);
    };

    const handlePostMessage = (
      e: MessageEvent<{
        type?: string;
        formData?: string;
      }>
    ) => {
      const whitelist = [`https://${DESKTOP_DOMAIN}`];
      if (!whitelist.includes(e.origin)) {
        return;
      }

      try {
        if (e.data?.type === 'InternalAppCall') {
          const { formData } = e.data;
          handleRedirect(formData);
        }
      } catch (error) {
        console.log('app redirect error:', error);
      }
    };

    window.addEventListener('message', handlePostMessage);

    if (router.isReady) {
      handleUrlParams();
    }

    return () => {
      window.removeEventListener('message', handlePostMessage);
    };
  }, [router.isReady, router.query]);

  return null;
};

export default RedirectPage;
