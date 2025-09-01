import Empty from './components/empty';
import DBList from './components/dbList';
import { useQuery } from '@tanstack/react-query';
import { useDBStore } from '@/store/db';
import { useLoading } from '@/hooks/useLoading';
import { useEffect, useState } from 'react';
import { serviceSideProps } from '@/utils/i18n';
import Sidebar from '@/components/Sidebar';
import { Box, Flex, Switch, Text } from '@chakra-ui/react';
import { useGuideStore } from '@/store/guide';
import { useRouter } from 'next/router';
import { track } from '@sealos/gtm';
import { type DatabaseAlertItem } from '@/api/db';

function Home() {
  const { dbList, setDBList, alerts, loadAlerts } = useDBStore();
  const { Loading } = useLoading();
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const { resetGuideState } = useGuideStore();

  const { refetch } = useQuery(['initDbData'], setDBList, {
    refetchInterval: 3000,
    onSettled() {
      setInitialized(true);
    }
  });

  // Fetch database alerts once when page loads
  useQuery(['databaseAlerts'], loadAlerts, {
    staleTime: Infinity,
    cacheTime: 5 * 60 * 1000
  });

  useEffect(() => {
    if (router.isReady) {
      const { action } = router.query as { action?: string };
      resetGuideState(!(action === 'guide'));

      track('module_open', {
        module: 'database',
        trigger: action === 'guide' ? 'onboarding' : 'manual'
      });
    }
  }, [resetGuideState, router]);

  return (
    <>
      <Flex bg={'grayModern.100'} h={'100%'} pb={'12px'} pr={'12px'} overflow={'hidden'}>
        <Sidebar />
        {dbList.length === 0 && initialized ? (
          <Empty />
        ) : (
          <DBList dbList={dbList} refetchApps={refetch} alerts={alerts} />
        )}
      </Flex>
      <Loading loading={!initialized} />
    </>
  );
}

export async function getServerSideProps(content: any) {
  return {
    props: {
      ...(await serviceSideProps(content))
    }
  };
}

export default Home;
