'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import Header from './components/Header';
import Version from './components/Version';
import MainBody from './components/MainBody';
import Basic from './components/Basic';
import IDEButton from '@/components/IDEButton';
import { Loading } from '@/components/ui/loading';

import { useEnvStore } from '@/stores/env';
import { useGuideStore } from '@/stores/guide';
import { useDevboxStore } from '@/stores/devbox';
import Sidebar from './components/Sidebar';

const DevboxDetailPage = ({ params }: { params: { name: string } }) => {
  const devboxName = params.name;

  const { env } = useEnvStore();
  const { guideIDE } = useGuideStore();
  const { devboxDetail, setDevboxDetail, loadDetailMonitorData, intervalLoadPods } =
    useDevboxStore();

  const [initialized, setInitialized] = useState(false);

  const { refetch } = useQuery(
    ['initDevboxDetail'],
    () => setDevboxDetail(devboxName, env.sealosDomain, !guideIDE),
    {
      onSettled() {
        setInitialized(true);
      }
    }
  );

  useQuery(
    ['devbox-detail-pod'],
    () => {
      if (devboxDetail?.isPause) return null;
      return intervalLoadPods(devboxName, true);
    },
    {
      enabled: !devboxDetail?.isPause,
      refetchOnMount: true,
      refetchInterval: 3000
    }
  );

  useQuery(
    ['loadDetailMonitorData', devboxName, devboxDetail?.isPause],
    () => {
      if (devboxDetail?.isPause) return null;
      return loadDetailMonitorData(devboxName);
    },
    {
      refetchOnMount: true,
      refetchInterval: 2 * 60 * 1000
    }
  );

  useEffect(() => {
    if (!IDEButton) {
      setInitialized(true);
    }
  }, []);

  if (!initialized || !devboxDetail) return <Loading />;

  return (
    <div className="flex h-[calc(100vh-28px)] flex-col">
      <Header refetchDevboxDetail={refetch} />
      <div className="flex h-full gap-2 px-6">
        <Sidebar />
        {/* right side */}
        <div className="flex h-full flex-col">
          <div className="flex">{/* <Basic /> */}</div>
        </div>
      </div>
    </div>
  );
};

export default DevboxDetailPage;
