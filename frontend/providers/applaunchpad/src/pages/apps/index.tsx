import { useEffect } from 'react';
import Empty from './components/empty';
import AppList from './components/appList';
import { useQuery } from '@tanstack/react-query';
// import Loading from '@/components/Loading';
import { useAppStore } from '@/store/app';
import { useLoading } from '@/hooks/useLoading';
import { useRouter } from 'next/router';

export default function Home() {
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
}
