'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import Basic from './components/Basic';
import Header from './components/Header';
import Monitor from './components/Monitor';
import Network from './components/Network';
import Sidebar from './components/Sidebar';
import Release from './components/Release';
import IDEButton from '@/components/IDEButton';
import { TabValue } from './components/Sidebar';
import { Loading } from '@sealos/shadcn-ui/loading';
import LiveMonitoring from './components/LiveMonitoring';
import AdvancedConfig from './components/AdvancedConfig';

import { useEnvStore } from '@/stores/env';
import { useGuideStore } from '@/stores/guide';
import { useDevboxStore } from '@/stores/devbox';
import { DevboxStatusEnum } from '@/constants/devbox';

const DevboxDetailPage = ({ params }: { params: { name: string } }) => {
  const devboxName = params.name;
  const searchParams = useSearchParams();
  const [currentTab, setCurrentTab] = useState<TabValue>('overview');

  const { env } = useEnvStore();
  const { guideIDE } = useGuideStore();
  const { devboxDetail, setDevboxDetail, loadDetailMonitorData, intervalLoadPods } =
    useDevboxStore();
  const isRunning = devboxDetail?.status.value === DevboxStatusEnum.Running;

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
    ['devbox-detail-pod', devboxName, devboxDetail?.status.value],
    () => intervalLoadPods(devboxName, true),
    {
      enabled: isRunning,
      refetchOnMount: true,
      refetchInterval: isRunning ? 3000 : false
    }
  );

  useQuery(
    ['loadDetailMonitorData', devboxName, devboxDetail?.status.value],
    () => loadDetailMonitorData(devboxName),
    {
      enabled: isRunning,
      refetchOnMount: true,
      refetchInterval: isRunning ? 2 * 60 * 1000 : false
    }
  );

  useEffect(() => {
    if (!IDEButton) {
      setInitialized(true);
    }
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab') as TabValue;
    const showAdvancedConfig =
      env.enableAdvancedEnvAndConfigmap === 'true' ||
      env.enableAdvancedNfs === 'true' ||
      env.enableAdvancedSharedMemory === 'true';
    if (
      tab &&
      (tab === 'overview' ||
        tab === 'monitor' ||
        tab === 'logs' ||
        (tab === 'advancedConfig' && showAdvancedConfig))
    ) {
      setCurrentTab(tab);
    }
  }, [
    searchParams,
    env.enableAdvancedEnvAndConfigmap,
    env.enableAdvancedNfs,
    env.enableAdvancedSharedMemory
  ]);

  if (!initialized || !devboxDetail) return <Loading />;

  const showEnvAndConfigmap = env.enableAdvancedEnvAndConfigmap === 'true';
  const showNfs = env.enableAdvancedNfs === 'true';
  const showAdvancedConfig = showEnvAndConfigmap || showNfs;

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
      case 'advancedConfig':
        return showAdvancedConfig ? (
          <AdvancedConfig showEnvAndConfigmap={showEnvAndConfigmap} showNfs={showNfs} />
        ) : null;
      // case 'logs':
      //   return <Logs />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-[calc(100vh-28px)] min-w-[1200px] flex-col px-6 overflow-hidden">
      <Header refetchDevboxDetail={refetch} />
      <div className="flex flex-1 gap-2 min-h-0">
        <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} />
        {/* right side */}
        {renderContent()}
      </div>
    </div>
  );
};

export default DevboxDetailPage;
