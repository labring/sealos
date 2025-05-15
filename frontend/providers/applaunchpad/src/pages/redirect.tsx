import { getAppByName } from '@/api/app';
import { useGlobalStore } from '@/store/global';
import { useGuideStore } from '@/store/guide';
import { AppEditSyncedFields } from '@/types/app';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const RedirectPage = () => {
  const router = useRouter();
  const { setLastRoute } = useGlobalStore();
  const { resetGuideState } = useGuideStore();

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
                setLastRoute(`/app/detail?name=${appName}`);
                router.replace({
                  pathname: '/app/edit',
                  query: { name: appName, formData }
                });
              }
            })
            .catch((err) => {
              setLastRoute('/');
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
      const { formData, action } = router.query as { formData?: string; action?: string };
      if (action === 'guide') {
        resetGuideState(false);
        router.replace('/apps?action=guide');
        return;
      }
      handleRedirect(formData);
    };

    if (router.isReady) {
      handleUrlParams();
    }
  }, [resetGuideState, router, router.isReady, router.query, setLastRoute]);

  return null;
};

export default RedirectPage;
