import { useLoading } from '@/hooks/useLoading';
import { useAppStore } from '@/store/app';
import { AppListItemType } from '@/types/app';
import { serviceSideProps } from '@/utils/i18n';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useRef, useState } from 'react';
import AppList from './components/appList';
import Empty from './components/empty';

const Home = () => {
  const router = useRouter();
  const { appList, setAppList, intervalLoadPods } = useAppStore();
  const { Loading } = useLoading();
  const [refresh, setFresh] = useState(false);
  const list = useRef<AppListItemType[]>(appList);

  const refreshList = useCallback(
    (res = appList) => {
      list.current = res;
      setFresh((state) => !state);
      return null;
    },
    [appList]
  );

  const { isLoading, refetch } = useQuery(['appListQuery'], () => setAppList(false), {
    onSettled(res) {
      if (!res) return;
      refreshList(res);
    }
  });

  useQuery(
    ['intervalLoadPods', appList.length],
    () =>
      Promise.allSettled(
        appList.map((app) => {
          if (app.isPause) return null;
          return intervalLoadPods(app.name, false);
        })
      ),
    {
      refetchOnMount: true,
      refetchInterval: 3000,
      onSettled() {
        refreshList();
      }
    }
  );

  useQuery(
    ['refresh'],
    () => {
      refreshList();
      return null;
    },
    {
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
        <AppList apps={list.current} refetchApps={refetch} />
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
