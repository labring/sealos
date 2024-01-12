import { useLoading } from '@/hooks/useLoading';
import { useAppStore } from '@/store/app';
import { AppListItemType } from '@/types/app';
import { serviceSideProps } from '@/utils/i18n';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { RequestController, isElementInViewport } from '@/utils/tools';
import AppList from './components/appList';
import Empty from './components/empty';

const Home = () => {
  const router = useRouter();
  const { appList, setAppList, intervalLoadPods, loadAvgMonitorData } = useAppStore();
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

  const { isLoading, refetch: refetchAppList } = useQuery(
    ['appListQuery'],
    () => setAppList(false),
    {
      onSettled(res) {
        if (!res) return;
        refreshList(res);
      }
    }
  );

  const requestController = useRef(new RequestController());

  useQuery(
    ['intervalLoadPods', appList.length],
    () => {
      const doms = document.querySelectorAll(`.appItem`);
      const viewportDomIds = Array.from(doms)
        .filter((item) => isElementInViewport(item))
        .map((item) => item.getAttribute('data-id'));

      const viewportApps =
        viewportDomIds.length < 3
          ? appList
          : appList.filter((app) => viewportDomIds.includes(app.id));

      return requestController.current.runTasks({
        tasks: viewportApps
          .filter((app) => !app.isPause)
          .map((app) => {
            return () => intervalLoadPods(app.name, false);
          }),
        limit: 3
      });
    },
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

  const { refetch: refetchAvgMonitorData } = useQuery(
    ['loadAvgMonitorData', appList.length],
    () => {
      const doms = document.querySelectorAll(`.appItem`);
      const viewportDomIds = Array.from(doms)
        .filter((item) => isElementInViewport(item))
        .map((item) => item.getAttribute('data-id'));

      const viewportApps =
        viewportDomIds.length < 3
          ? appList
          : appList.filter((app) => viewportDomIds.includes(app.id));

      return requestController.current.runTasks({
        tasks: viewportApps
          .filter((app) => !app.isPause)
          .map((app) => {
            return () => loadAvgMonitorData(app.name);
          }),
        limit: 3
      });
    },
    {
      refetchOnMount: true,
      refetchInterval: 2 * 60 * 1000,
      onError(err) {
        console.log(err);
      },
      onSettled() {
        refreshList();
      }
    }
  );

  useEffect(() => {
    router.prefetch('/app/detail');
    router.prefetch('/app/edit');

    return () => {
      requestController.current?.stop();
    };
  }, [router]);

  return (
    <>
      {appList.length === 0 && !isLoading ? (
        <Empty />
      ) : (
        <AppList
          apps={list.current}
          refetchApps={() => {
            refetchAppList();
            refetchAvgMonitorData();
          }}
        />
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
