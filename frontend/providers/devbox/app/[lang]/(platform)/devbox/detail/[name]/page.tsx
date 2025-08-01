'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import Logs from './components/Logs';
import Basic from './components/Basic';
import Header from './components/Header';
import Monitor from './components/Monitor';
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
          <div className="flex h-full w-full flex-col gap-2">
            <div className="flex h-[60%] min-h-fit w-full gap-2">
              <Basic />
              <div className="flex w-full flex-col gap-2">
                <LiveMonitoring />
                <Network />
              </div>
            </div>
            <Release />
          </div>
        );
      case 'monitor':
        return <Monitor />;
      // case 'logs':
      //   return <Logs />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-[calc(100vh-28px)] flex-col px-6">
      <Header refetchDevboxDetail={refetch} />
      <div className="flex h-full gap-2">
        <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} />
        {/* right side */}
        {renderContent()}
      </div>
    </div>
  );
};

export default DevboxDetailPage;
