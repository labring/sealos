import { useLoading } from '@/hooks/useLoading';
import { useAppStore } from '@/store/app';
import { serviceSideProps } from '@/utils/i18n';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import AppList from './components/appList';
import Empty from './components/empty';

const Home = () => {
  const router = useRouter();
  const { appList, setAppList, intervalLoadPods } = useAppStore();
  const { Loading } = useLoading();
  const { isLoading, refetch } = useQuery(['appListQuery'], setAppList);

  useQuery(
    ['intervalLoadPods', appList.length],
    () =>
      appList.map((app) => {
        if (app.isPause) return null;
        return intervalLoadPods(app.name);
      }),
    {
      refetchOnMount: true,
      refetchInterval: 3000
    }
  );

  useEffect(() => {
    router.prefetch('/app/detail');
    router.prefetch('/app/edit');
  }, [router]);

  return (
    <>
      {appList.length === 0 && !isLoading ? (
        <Empty />
      ) : (
        <AppList apps={appList} refetchApps={refetch} />
      )}
      <Loading loading={isLoading} />
    </>
  );
};

export async function getServerSideProps(content: any) {
  return {
    props: {
      ...(await serviceSideProps(content))
    }
  };
}

export default Home;
