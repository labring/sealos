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
import { getUserNamespace } from '@/utils/user';
import { getDatabaseAlerts, getMockDatabaseAlerts, type DatabaseAlertItem } from '@/api/db';

function Home() {
  const { dbList, setDBList } = useDBStore();
  const { Loading } = useLoading();
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const { resetGuideState } = useGuideStore();
  const [alerts, setAlerts] = useState<Record<string, DatabaseAlertItem>>({});

  const { refetch } = useQuery(['initDbData'], setDBList, {
    refetchInterval: 3000,
    onSettled() {
      setInitialized(true);
    }
  });

  // fetch database alerts as soon as page loads
  useEffect(() => {
    const mockAlerts = getMockDatabaseAlerts();
    // const ns = getUserNamespace();
    // list = await getDatabaseAlerts(ns);
    const map = (mockAlerts || []).reduce((acc, cur) => {
      acc[cur.name] = cur;
      return acc;
    }, {} as Record<string, DatabaseAlertItem>);
    setAlerts(map);
  }, []);

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
