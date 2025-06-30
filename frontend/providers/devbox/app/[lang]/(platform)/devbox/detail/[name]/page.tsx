'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import Header from './components/Header';
import Version from './components/Version';
import MainBody from './components/MainBody';
import BasicInfo from './components/BasicInfo';
import IDEButton from '@/components/IDEButton';
import { Loading } from '@/components/ui/loading';

import { cn } from '@/lib/utils';
import { useEnvStore } from '@/stores/env';
import { useGuideStore } from '@/stores/guide';
import { useDevboxStore } from '@/stores/devbox';

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
      {/* <div className="relative flex h-0 flex-1">
        <div
          className={cn(
            'z-10 mr-4 h-full w-[410px] flex-none overflow-auto rounded-lg border bg-white transition-transform duration-400'
          )}
        >
          <BasicInfo />
        </div>
        <div className="scrollbar-hide flex min-h-full w-0 flex-1 flex-col overflow-auto">
          <div className="mb-4 min-h-[257px] flex-shrink-0 rounded-lg bg-white">
            <MainBody />
          </div>
          <div className="flex-1 rounded-lg bg-white">
            <Version />
          </div>
        </div>
      </div> */}
    </div>
  );
};

export default DevboxDetailPage;
