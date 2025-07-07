'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import Basic from './components/Basic';
import Header from './components/Header';
import Network from './components/Network';
import Sidebar from './components/Sidebar';
import Release from './components/Release';
import IDEButton from '@/components/IDEButton';
import { TabValue } from './components/Sidebar';
import { Loading } from '@/components/ui/loading';
import LiveMonitoring from './components/LiveMonitoring';

import { useEnvStore } from '@/stores/env';
import { useGuideStore } from '@/stores/guide';
import { useDevboxStore } from '@/stores/devbox';

const DevboxDetailPage = ({ params }: { params: { name: string } }) => {
  const devboxName = params.name;
  const [currentTab, setCurrentTab] = useState<TabValue>('overview');

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

  const renderContent = () => {
    switch (currentTab) {
      case 'overview':
        return (
          <>
            <div className="flex h-full w-0 gap-2">
              <Basic />
              <div className="flex flex-1 flex-col gap-2">
                <LiveMonitoring />
                <Network />
              </div>
            </div>
            <Release />
          </>
        );
      case 'monitor':
        return (
          <div className="flex-1">
            <LiveMonitoring />
          </div>
        );
      case 'logs':
        return (
          <div className="flex-1 rounded-xl border-[0.5px] border-zinc-200 bg-white p-4">
            <h2 className="text-lg font-medium">Logs</h2>
            <p className="text-zinc-500">Coming soon...</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-[calc(100vh-28px)] min-w-[1600px] flex-col px-6">
      <Header refetchDevboxDetail={refetch} />
      <div className="flex h-full gap-2">
        <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} />
        {/* right side */}
        <div className="flex h-full flex-1 flex-col gap-2">{renderContent()}</div>
      </div>
    </div>
  );
};

export default DevboxDetailPage;
