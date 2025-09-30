import { getDBByName } from '@/api/db';
import { useGuideStore } from '@/store/guide';
import { useUserStore } from '@/store/user';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const RedirectPage = () => {
  const router = useRouter();
  const { resetGuideState } = useGuideStore();
  const { session } = useUserStore();

  useEffect(() => {
    // Wait for session initialization.
    if (!session) return;

    const handleRedirect = (name?: string) => {
      if (name) {
        getDBByName({ name })
          .then((app) => {
            router.replace({
              pathname: '/db/detail',
              query: { name: app.dbName, dbType: app.dbType }
            });
          })
          .catch((err) => {
            router.replace('/dbs');
          });
      } else {
        router.replace('/dbs');
      }
    };

    if (router.isReady) {
      const { name, action } = router.query as { name?: string; action?: string };
      if (action === 'guide') {
        resetGuideState(false);
        router.replace('/dbs?action=guide');
        return;
      }
      handleRedirect(name);
    }
  }, [session, resetGuideState, router, router.isReady, router.query]);

  return null;
};

export default RedirectPage;
