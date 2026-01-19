import DetailLayout from '@/components/layouts/DetailLayout';
import { useAppStore } from '@/store/app';
import { serviceSideProps } from '@/utils/i18n';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Monitor/Header';
import MonitorChart from '@/components/MonitorChart';
import { useEffect, useMemo, useState } from 'react';
import { ListItem } from '@/components/AdvancedSelect';
import useDateTimeStore from '@/store/date';
import { getAppMonitorData } from '@/api/app';
import { LineChart } from 'lucide-react';
import { track } from '@sealos/gtm';
import { generatePvcNameRegex } from '@/utils/tools';
import { parseTimeRange } from '@/utils/timeRange';
import { Skeleton } from '@sealos/shadcn-ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@sealos/shadcn-ui/tabs';

export default function MonitorPage({ appName }: { appName: string }) {
  const { appDetail, appDetailPods } = useAppStore();
  const { t } = useTranslation();
  const {
    startDateTime,
    endDateTime,
    setStartDateTime,
    setEndDateTime,
    isManualRange,
    autoRange,
    refreshInterval
  } = useDateTimeStore();
  const [podList, setPodList] = useState<ListItem[]>([]);

  useEffect(() => {
    track('module_view', {
      module: 'applaunchpad',
      view_name: 'monitors'
    });
  }, []);

  useEffect(() => {
    if (!refreshInterval) return;

    const timer = window.setInterval(() => {
      if (isManualRange) return;
      const now = new Date();
      if (autoRange) {
        const { startTime } = parseTimeRange(autoRange, now);
        setStartDateTime(startTime);
        setEndDateTime(now);
      } else {
        const durationMs = Math.max(0, endDateTime.getTime() - startDateTime.getTime());
        setStartDateTime(new Date(now.getTime() - durationMs));
        setEndDateTime(now);
      }
    }, refreshInterval);

    return () => window.clearInterval(timer);
  }, [
    refreshInterval,
    isManualRange,
    autoRange,
    startDateTime,
    endDateTime,
    setStartDateTime,
    setEndDateTime
  ]);

  useEffect(() => {
    if (appDetailPods?.length > 0 && podList.length === 0) {
      setPodList(
        appDetailPods.map((pod) => ({
          value: pod.podName,
          label: pod.podName,
          checked: true
        }))
      );
    }
  }, [appDetailPods, podList]);

  const {
    data: memoryData,
    isLoading,
    refetch: refetchMemoryData
  } = useQuery(
    ['monitor-data-memory', appName, appDetailPods?.[0]?.podName, startDateTime, endDateTime],
    () =>
      getAppMonitorData({
        queryKey: 'memory',
        queryName: appDetailPods?.[0]?.podName || appName,
        step: '2m',
        start: startDateTime.getTime(),
        end: endDateTime.getTime()
      }),
    {
      refetchInterval: refreshInterval,
      enabled: !!appDetailPods?.[0]?.podName
    }
  );

  const memoryLatestAvg = useMemo(() => {
    if (!memoryData?.length) return 0;

    const sum = memoryData.reduce((acc, pod) => {
      const lastValue = Number(pod?.yData?.[pod?.yData?.length - 1]);
      return acc + lastValue;
    }, 0);

    return (sum / memoryData.length).toFixed(2);
  }, [memoryData]);

  const { data: cpuData, refetch: refetchCpuData } = useQuery(
    ['monitor-data-cpu', appName, appDetailPods?.[0]?.podName, startDateTime, endDateTime],
    () =>
      getAppMonitorData({
        queryKey: 'cpu',
        queryName: appDetailPods?.[0]?.podName || appName,
        step: '2m',
        start: startDateTime.getTime(),
        end: endDateTime.getTime()
      }),
    {
      refetchInterval: refreshInterval,
      enabled: !!appDetailPods?.[0]?.podName
    }
  );
  const pvcNameRegex = generatePvcNameRegex(appDetail);

  const { data: storageData, refetch: refetchStorageData } = useQuery(
    ['monitor-data-storage', appName, pvcNameRegex, startDateTime, endDateTime],
    () =>
      getAppMonitorData({
        queryKey: 'storage',
        queryName: pvcNameRegex || appName,
        step: '2m',
        start: startDateTime.getTime(),
        end: endDateTime.getTime(),
        pvcName: pvcNameRegex
      }),
    {
      refetchInterval: refreshInterval,
      enabled: !!pvcNameRegex
    }
  );
  const cpuLatestAvg = useMemo(() => {
    if (!cpuData?.length) return 0;

    const sum = cpuData.reduce((acc, pod) => {
      const lastValue = Number(pod?.yData?.[pod?.yData?.length - 1]);
      return acc + lastValue;
    }, 0);

    return (sum / cpuData.length).toFixed(2);
  }, [cpuData]);

  const storageLatestValue = useMemo(() => {
    if (!storageData?.length) return 0;
    const lastValue = Number(storageData?.[0]?.yData?.[storageData?.[0]?.yData?.length - 1]);
    return lastValue.toFixed(2);
  }, [storageData]);

  const memoryChartData = useMemo(() => {
    const selectedPods = podList.filter((pod) => pod.checked);

    const filteredData = memoryData?.filter((item) =>
      selectedPods.some((pod) => pod.value === item.name)
    );

    if (filteredData?.length === 0) {
      return {
        xData: [] as string[],
        yData: [] as { name: string; type: string; data: number[] }[]
      };
    }

    const xData = filteredData?.[0]?.xData?.map(String) || [];
    const yData =
      filteredData?.map((item) => ({
        name: item?.name || 'unknown',
        type: 'line',
        data: item?.yData?.map(Number) || []
      })) || [];

    return {
      xData,
      yData
    };
  }, [memoryData, podList]);

  const cpuChartData = useMemo(() => {
    const selectedPods = podList.filter((pod) => pod.checked);
    const filteredData = cpuData?.filter((item) =>
      selectedPods.some((pod) => pod.value === item.name)
    );

    if (filteredData?.length === 0) {
      return {
        xData: [] as string[],
        yData: [] as { name: string; type: string; data: number[] }[]
      };
    }

    const xData = filteredData?.[0]?.xData?.map(String) || [];
    const yData =
      filteredData?.map((item) => ({
        name: item?.name || 'unknown',
        type: 'line',
        data: item?.yData?.map(Number) || []
      })) || [];

    return {
      xData,
      yData
    };
  }, [cpuData, podList]);

  const storageChartData = useMemo(() => {
    const selectedPods = podList.filter((pod) => pod.checked);
    const xData = storageData?.[0]?.xData?.map(String) || [];
    const yData =
      storageData?.map((item) => ({
        name: item?.name || 'unknown',
        type: 'line',
        data: item?.yData?.map(Number) || []
      })) || [];

    return {
      xData,
      yData
    };
  }, [storageData, podList]);

  const refetchData = () => {
    if (!isManualRange) {
      const now = new Date();
      if (autoRange) {
        const { startTime } = parseTimeRange(autoRange, now);
        setStartDateTime(startTime);
        setEndDateTime(now);
      } else {
        const durationMs = Math.max(0, endDateTime.getTime() - startDateTime.getTime());
        setStartDateTime(new Date(now.getTime() - durationMs));
        setEndDateTime(now);
      }
    }
    refetchCpuData();
    refetchMemoryData();
    refetchStorageData();
  };

  return (
    <DetailLayout appName={appName} key={'monitor'}>
      <div className="flex flex-col flex-1 rounded-lg overflow-y-auto scrollbar-hide gap-2">
        <div className="bg-white flex flex-col border-[0.5px] border-zinc-200 rounded-xl shadow-xs">
          <Header podList={podList} setPodList={setPodList} refetchData={refetchData} />
        </div>
        <div className="bg-white flex flex-col flex-1 min-h-fit border-[0.5px] border-zinc-200 rounded-xl shadow-xs">
          <Tabs defaultValue="performance" className="w-full flex-1 min-h-0 gap-0">
            <TabsList className="w-full h-12 rounded-none bg-transparent flex justify-start p-0">
              <TabsTrigger
                value="performance"
                className="w-[145px] h-full flex-none shrink-0 leading-none rounded-none px-2 py-4 text-base font-medium text-zinc-400 border-r-1 border-l-0 border-b-1 border-t-0 rounded-tl-xl shadow-none border-zinc-200 data-[state=active]:text-zinc-900 data-[state=active]:border-b-[1.5px] data-[state=active]:border-b-zinc-900 data-[state=active]:shadow-none hover:bg-zinc-100"
              >
                {t('monitor_tab_performance')}
              </TabsTrigger>
              <TabsTrigger
                value="network"
                className="w-[145px] h-full flex-none shrink-0 leading-none rounded-none px-2 py-4 text-base font-medium text-zinc-400 border-r-1 border-l-0 border-b-1 border-t-0 shadow-none border-zinc-200 data-[state=active]:text-zinc-900 data-[state=active]:border-b-[1.5px] data-[state=active]:border-b-zinc-900 data-[state=active]:shadow-none hover:bg-zinc-100"
              >
                {t('monitor_tab_network')}
              </TabsTrigger>
              <TabsTrigger
                value="storage"
                className="w-[145px] h-full flex-none shrink-0 leading-none rounded-none px-2 py-4 text-base font-medium text-zinc-400 border-r-1 border-l-0 border-b-1 border-t-0 shadow-none border-zinc-200 data-[state=active]:text-zinc-900 data-[state=active]:border-b-[1.5px] data-[state=active]:border-b-zinc-900 data-[state=active]:shadow-none hover:bg-zinc-100"
              >
                {t('monitor_tab_storage')}
              </TabsTrigger>
              <div className="h-full flex-1 border-b rounded-tr-xl shadow-none border-zinc-200"></div>
            </TabsList>
            <TabsContent value="performance" className="p-0 flex-1 min-h-0">
              {!isLoading ? (
                <div className="flex flex-col flex-1 min-h-0">
                  <div className="border-b border-zinc-200 px-10 py-8 flex flex-col gap-5 flex-1 h-full min-h-0">
                    <div className="flex items-center justify-between">
                      <div className="text-base font-medium text-zinc-900">
                        CPU: (<span className="font-normal text-zinc-500">{cpuLatestAvg}%</span>)
                      </div>
                    </div>
                    <div className="flex-1 min-h-[200px] relative">
                      {cpuChartData?.yData?.length > 0 ? (
                        <MonitorChart
                          data={cpuChartData}
                          title={'chartTitle'}
                          unit="%"
                          yAxisLabelFormatter={(value) => `${value}%`}
                          appName={appName}
                          type="cpu"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center flex-col gap-3">
                          <div className="h-10 w-10 flex items-center justify-center border border-dashed border-zinc-200 rounded-xl">
                            <LineChart className="w-6 h-6 text-zinc-400 stroke-[1.5px]" />
                          </div>
                          <div className="text-zinc-900 text-sm font-semibold">
                            {t('no_data_available')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="px-10 py-8 flex flex-col gap-5 flex-1 h-full min-h-0">
                    <div className="flex items-center justify-between">
                      <div className="text-base font-medium text-zinc-900">
                        Memory: (
                        <span className="font-normal text-zinc-500">{memoryLatestAvg}%</span>)
                      </div>
                    </div>
                    <div className="flex-1 min-h-[200px] relative">
                      {memoryChartData?.yData?.length > 0 ? (
                        <MonitorChart
                          data={memoryChartData}
                          title={'chartTitle'}
                          unit="%"
                          yAxisLabelFormatter={(value) => `${value}%`}
                          appName={appName}
                          type="memory"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center flex-col gap-3">
                          <div className="h-10 w-10 flex items-center justify-center border border-dashed border-zinc-200 rounded-xl">
                            <LineChart className="w-6 h-6 text-zinc-400 stroke-[1.5px]" />
                          </div>
                          <div className="text-zinc-900 text-sm font-semibold">
                            {t('no_data_available')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {[{ height: 'h-[242px]' }, { height: 'h-[200px]' }].map((item, index) => (
                    <div key={`monitor-skeleton-performance-${index}`} className="px-6 py-6">
                      <Skeleton className="h-5 w-[140px] rounded-lg" />
                      <Skeleton className={`mt-6 w-full rounded-lg ${item.height}`} />
                    </div>
                  ))}
                </>
              )}
            </TabsContent>
            <TabsContent value="network" className="p-0 flex-1 min-h-0">
              {!isLoading ? (
                <div className="flex flex-col flex-1 min-h-0">
                  <div className="border-b border-zinc-200 px-10 py-8 flex flex-col gap-5 flex-1 h-full min-h-0">
                    <div className="flex items-center justify-between">
                      <div className="text-base font-medium text-zinc-900">
                        CPU: (<span className="font-normal text-zinc-500">{cpuLatestAvg}%</span>)
                      </div>
                    </div>
                    <div className="flex-1 min-h-[200px] relative">
                      {cpuChartData?.yData?.length > 0 ? (
                        <MonitorChart
                          data={cpuChartData}
                          title={'chartTitle'}
                          unit="%"
                          yAxisLabelFormatter={(value) => `${value}%`}
                          appName={appName}
                          type="cpu"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center flex-col gap-3">
                          <div className="h-10 w-10 flex items-center justify-center border border-dashed border-zinc-200 rounded-xl">
                            <LineChart className="w-6 h-6 text-zinc-400 stroke-[1.5px]" />
                          </div>
                          <div className="text-zinc-900 text-sm font-semibold">
                            {t('no_data_available')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="px-10 py-8 flex flex-col gap-5 flex-1 h-full min-h-0">
                    <div className="flex items-center justify-between">
                      <div className="text-base font-medium text-zinc-900">
                        Memory: (
                        <span className="font-normal text-zinc-500">{memoryLatestAvg}%</span>)
                      </div>
                    </div>
                    <div className="flex-1 min-h-[200px] relative">
                      {memoryChartData?.yData?.length > 0 ? (
                        <MonitorChart
                          data={memoryChartData}
                          title={'chartTitle'}
                          unit="%"
                          yAxisLabelFormatter={(value) => `${value}%`}
                          appName={appName}
                          type="memory"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center flex-col gap-3">
                          <div className="h-10 w-10 flex items-center justify-center border border-dashed border-zinc-200 rounded-xl">
                            <LineChart className="w-6 h-6 text-zinc-400 stroke-[1.5px]" />
                          </div>
                          <div className="text-zinc-900 text-sm font-semibold">
                            {t('no_data_available')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {[{ height: 'h-[242px]' }, { height: 'h-[200px]' }].map((item, index) => (
                    <div key={`monitor-skeleton-network-${index}`} className="px-6 py-6">
                      <Skeleton className="h-5 w-[140px] rounded-lg" />
                      <Skeleton className={`mt-6 w-full rounded-lg ${item.height}`} />
                    </div>
                  ))}
                </>
              )}
            </TabsContent>
            <TabsContent value="storage" className="p-0 flex-1 min-h-0">
              {!isLoading ? (
                <div className="px-10 py-8 flex flex-col gap-5 flex-1 h-full min-h-0">
                  <div className="flex items-center justify-between">
                    <div className="text-base font-medium text-zinc-900">
                      Storage: (
                      <span className="font-normal text-zinc-500">{storageLatestValue}%</span>)
                    </div>
                  </div>
                  <div className="flex-1 min-h-[200px] relative">
                    {storageChartData?.yData?.length > 0 ? (
                      <MonitorChart
                        data={storageChartData}
                        title={'chartTitle'}
                        unit="%"
                        yAxisLabelFormatter={(value) => `${value}%`}
                        appName={appName}
                        type="storage"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center flex-col gap-3">
                        <div className="h-10 w-10 flex items-center justify-center border border-dashed border-zinc-200 rounded-xl">
                          <LineChart className="w-6 h-6 text-zinc-400 stroke-[1.5px]" />
                        </div>
                        <div className="text-zinc-900 text-sm font-semibold">
                          {t('no_data_available')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="px-6 py-6">
                  <Skeleton className="h-5 w-[140px] rounded-lg" />
                  <Skeleton className="mt-6 h-[200px] w-full rounded-lg" />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DetailLayout>
  );
}

export async function getServerSideProps(content: any) {
  const appName = content?.query?.name || '';

  return {
    props: {
      appName,
      ...(await serviceSideProps(content))
    }
  };
}
