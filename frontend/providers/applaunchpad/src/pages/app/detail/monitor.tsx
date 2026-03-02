import DetailLayout from '@/components/layouts/DetailLayout';
import { useAppStore } from '@/store/app';
import { serviceSideProps } from '@/utils/i18n';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Header, { MonitorTab } from '@/components/Monitor/Header';
import MonitorChart from '@/components/MonitorChart';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ListItem } from '@/components/AdvancedSelect';
import useDateTimeStore from '@/store/date';
import { getAppMonitorData, getNetworkMonitorData } from '@/api/app';
import { LineChart } from 'lucide-react';
import { track } from '@sealos/gtm';
import { generatePvcNameRegex } from '@/utils/tools';
import { parseTimeRange } from '@/utils/timeRange';
import { Skeleton } from '@sealos/shadcn-ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@sealos/shadcn-ui/tabs';
import { useRouter } from 'next/router';

const getPaddedAxisMax = (value: { max: number }) => {
  const rawMax = value?.max ?? 0;
  if (rawMax <= 0) return 1;
  const padded = rawMax * 1.1;
  const step = rawMax < 1000 ? 10 : rawMax < 5000 ? 50 : 100;
  return Math.ceil(padded / step) * step;
};
const getPercentAxisMax = (value: { max: number }) => {
  const rawMax = value?.max ?? 0;
  if (rawMax <= 0) return 100;
  const rounded = Math.ceil(rawMax / 10) * 10;
  const nextMax = rounded <= rawMax ? rounded + 10 : rounded;
  return Math.max(100, nextMax);
};

export default function MonitorPage({ appName }: { appName: string }) {
  const router = useRouter();
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
  const [currentTab, setCurrentTab] = useState<MonitorTab>('performance');
  const urlPodName = useMemo(() => {
    const podParam = router.query.pod;
    return typeof podParam === 'string' ? podParam : undefined;
  }, [router.query.pod]);

  // use useCallback to avoid unnecessary re-renders of MonitorChart
  const percentFormatter = useCallback((value: number) => `${value}%`, []);
  const getLatestNumericValue = useCallback((values?: Array<string | null>) => {
    if (!values?.length) return null;
    for (let i = values.length - 1; i >= 0; i -= 1) {
      const raw = values[i];
      if (raw === null || raw === undefined) continue;
      const numeric = Number(raw);
      if (!Number.isNaN(numeric)) return numeric;
    }
    return null;
  }, []);

  useEffect(() => {
    track('module_view', {
      module: 'applaunchpad',
      view_name: 'monitors'
    });
  }, []);

  // update time range after set refresh interval
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

  // Reset pod list when app changes
  useEffect(() => {
    setPodList([]);
  }, [appName]);

  // Update pod list when appDetailPods changes
  useEffect(() => {
    setPodList((prevList) => {
      // If no pods, return empty list (but only if prevList is not already empty)
      if (!appDetailPods?.length) {
        return prevList.length === 0 ? prevList : [];
      }

      // Check if pods actually changed (same pod names in same order)
      const currentPodNames = appDetailPods.map((p) => p.podName);
      const prevPodNames = prevList.map((p) => p.value);
      const podsChanged =
        currentPodNames.length !== prevPodNames.length ||
        currentPodNames.some((name, i) => name !== prevPodNames[i]);

      // If pods haven't changed, keep the same reference to avoid re-renders
      if (!podsChanged) {
        return prevList;
      }

      const hasPrevPods = prevList.length > 0;
      const shouldUseUrlPod =
        !!urlPodName && appDetailPods.some((pod) => pod.podName === urlPodName);

      // Create a map of existing checked states (only for pods belonging to current app)
      const checkedMap = new Map(
        prevList
          .filter((p) => appDetailPods.some((pod) => pod.podName === p.value))
          .map((p) => [p.value, p.checked])
      );

      return appDetailPods.map((pod) => ({
        value: pod.podName,
        label: pod.podName,
        // Preserve checked state for existing pods, default to true for new pods
        checked: hasPrevPods
          ? checkedMap.get(pod.podName) ?? true
          : shouldUseUrlPod
          ? pod.podName === urlPodName
          : true
      }));
    });
  }, [appDetailPods, urlPodName]);

  useEffect(() => {
    if (!router.isReady || !urlPodName) return;
    if (!appDetailPods?.some((pod) => pod.podName === urlPodName)) return;
    const { pod: _pod, ...rest } = router.query;
    router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true });
  }, [appDetailPods, router, urlPodName]);

  // memory data
  const {
    data: memoryData,
    isLoading,
    refetch: refetchMemoryData,
    dataUpdatedAt: memoryDataUpdatedAt
  } = useQuery(
    [
      'monitor-data-memory',
      appName,
      appDetailPods?.[0]?.podName,
      startDateTime.getTime(),
      endDateTime.getTime()
    ],
    async () => {
      const result = await getAppMonitorData({
        queryKey: 'memory',
        queryName: appDetailPods?.[0]?.podName || appName,
        step: '2m',
        start: startDateTime.getTime(),
        end: endDateTime.getTime()
      });
      return result;
    },
    {
      refetchInterval: refreshInterval,
      enabled: !!appDetailPods?.[0]?.podName
    }
  );

  // memory latest average
  const memoryLatestAvg = useMemo(() => {
    if (!memoryData?.length) return '0.00';

    let sum = 0;
    let count = 0;
    memoryData.forEach((pod) => {
      const lastValue = getLatestNumericValue(pod?.yData);
      if (lastValue !== null) {
        sum += lastValue;
        count += 1;
      }
    });

    return count > 0 ? (sum / count).toFixed(2) : '0.00';
  }, [getLatestNumericValue, memoryData]);

  // cpu data
  const {
    data: cpuData,
    refetch: refetchCpuData,
    dataUpdatedAt: cpuDataUpdatedAt
  } = useQuery(
    [
      'monitor-data-cpu',
      appName,
      appDetailPods?.[0]?.podName,
      startDateTime.getTime(),
      endDateTime.getTime()
    ],
    async () => {
      const result = await getAppMonitorData({
        queryKey: 'cpu',
        queryName: appDetailPods?.[0]?.podName || appName,
        step: '2m',
        start: startDateTime.getTime(),
        end: endDateTime.getTime()
      });
      return result;
    },
    {
      refetchInterval: refreshInterval,
      enabled: !!appDetailPods?.[0]?.podName
    }
  );

  // storage data
  const pvcNameRegex = generatePvcNameRegex(appDetail);
  const {
    data: storageData,
    refetch: refetchStorageData,
    dataUpdatedAt: storageDataUpdatedAt
  } = useQuery(
    ['monitor-data-storage', appName, pvcNameRegex, startDateTime.getTime(), endDateTime.getTime()],
    async () => {
      const result = await getAppMonitorData({
        queryKey: 'storage',
        queryName: pvcNameRegex || appName,
        step: '2m',
        start: startDateTime.getTime(),
        end: endDateTime.getTime(),
        pvcName: pvcNameRegex
      });
      return result;
    },
    {
      refetchInterval: refreshInterval,
      enabled: !!pvcNameRegex
    }
  );

  // cpu latest average
  const cpuLatestAvg = useMemo(() => {
    if (!cpuData?.length) return '0.00';

    let sum = 0;
    let count = 0;
    cpuData.forEach((pod) => {
      const lastValue = getLatestNumericValue(pod?.yData);
      if (lastValue !== null) {
        sum += lastValue;
        count += 1;
      }
    });

    return count > 0 ? (sum / count).toFixed(2) : '0.00';
  }, [cpuData, getLatestNumericValue]);

  // Get all available networks for monitoring (only non-NodePort networks)
  const availableNetworks = useMemo(() => {
    // Filter networks where openNodePort is false (HTTP/GRPC/WS protocols)
    const networks = appDetail?.networks?.filter((network) => !network.openNodePort) || [];
    return networks.slice().sort((a, b) => (a?.port ?? 0) - (b?.port ?? 0));
  }, [appDetail?.networks]);

  // State for selected network index
  const [selectedNetworkIndex, setSelectedNetworkIndex] = useState<number>(0);

  // Get current selected network info directly from availableNetworks
  const networkInfo = useMemo(() => {
    const network = availableNetworks[selectedNetworkIndex];
    return {
      serviceName: network?.serviceName || '',
      port: network?.port || 0
    };
  }, [availableNetworks, selectedNetworkIndex]);

  // Network request count data
  const {
    data: networkCountData,
    refetch: refetchNetworkCountData,
    dataUpdatedAt: networkCountDataUpdatedAt,
    isLoading: isNetworkCountLoading
  } = useQuery(
    [
      'monitor-data-network-count',
      appName,
      networkInfo.serviceName,
      networkInfo.port,
      startDateTime.getTime(),
      endDateTime.getTime()
    ],
    async () => {
      const result = await getNetworkMonitorData({
        serviceName: networkInfo.serviceName,
        port: networkInfo.port,
        type: 'network_service_request_count',
        step: '2m',
        start: startDateTime.getTime(),
        end: endDateTime.getTime()
      });
      return result;
    },
    {
      refetchInterval: refreshInterval,
      enabled: !!networkInfo.serviceName && !!networkInfo.port
    }
  );

  // Network request percent data
  const {
    data: networkPercentData,
    refetch: refetchNetworkPercentData,
    dataUpdatedAt: networkPercentDataUpdatedAt,
    isLoading: isNetworkPercentLoading
  } = useQuery(
    [
      'monitor-data-network-percent',
      appName,
      networkInfo.serviceName,
      networkInfo.port,
      startDateTime.getTime(),
      endDateTime.getTime()
    ],
    async () => {
      const result = await getNetworkMonitorData({
        serviceName: networkInfo.serviceName,
        port: networkInfo.port,
        type: 'network_service_request_percent',
        step: '2m',
        start: startDateTime.getTime(),
        end: endDateTime.getTime()
      });
      return result;
    },
    {
      refetchInterval: refreshInterval,
      enabled: !!networkInfo.serviceName && !!networkInfo.port
    }
  );

  // Network count chart data
  const networkCountChartData = useMemo(() => {
    if (!networkCountData?.length) {
      return {
        xData: [] as string[],
        yData: [] as { name: string; type: string; data: Array<number | null> }[]
      };
    }

    const xData = networkCountData[0]?.xData?.map(String) || [];
    const yData =
      networkCountData.map((item) => ({
        name: item?.name || 'unknown',
        type: 'line',
        data: item?.yData?.map((value) => (value === null ? null : Number(value))) || []
      })) || [];

    const chartData = {
      xData,
      yData
    };
    return chartData;
  }, [networkCountData]);

  // Network percent chart data
  const networkPercentChartData = useMemo(() => {
    if (!networkPercentData?.length) {
      return {
        xData: [] as string[],
        yData: [] as { name: string; type: string; data: Array<number | null> }[]
      };
    }

    const xData = networkPercentData[0]?.xData?.map(String) || [];
    const yData =
      networkPercentData.map((item) => ({
        name: item?.name || 'unknown',
        type: 'line',
        data: item?.yData?.map((value) => (value === null ? null : Number(value))) || []
      })) || [];

    const chartData = {
      xData,
      yData
    };
    return chartData;
  }, [networkPercentData]);

  // Network total count (sum of latest values for all status codes)
  const networkTotalCount = useMemo(() => {
    if (!networkCountData?.length) return '0';

    let total = 0;
    networkCountData.forEach((item) => {
      const lastValue = getLatestNumericValue(item?.yData);
      if (lastValue !== null) {
        total += lastValue;
      }
    });

    return Math.round(total).toString();
  }, [networkCountData, getLatestNumericValue]);

  // storage latest value
  const storageLatestValue = useMemo(() => {
    const selectedPods = podList.filter((pod) => pod.checked);
    const filteredData = storageData?.filter((item) =>
      selectedPods.some((pod) => item?.name?.endsWith(pod.value))
    );
    if (!filteredData?.length) return '0.00';
    const lastValue = getLatestNumericValue(filteredData?.[0]?.yData);
    return lastValue !== null ? lastValue.toFixed(2) : '0.00';
  }, [getLatestNumericValue, podList, storageData]);

  // All active pod names (all pods in podList, used to distinguish active vs deprecated)
  const activePodNames = useMemo(() => {
    return podList.map((pod) => pod.value);
  }, [podList]);

  // Checked pod names (only pods selected in header)
  const checkedPodNames = useMemo(() => {
    return podList.filter((pod) => pod.checked).map((pod) => pod.value);
  }, [podList]);

  // memory chart data - include all pods (active and deprecated) for chart display
  const memoryChartData = useMemo(() => {
    if (!memoryData?.length) {
      return {
        xData: [] as string[],
        yData: [] as { name: string; type: string; data: Array<number | null> }[]
      };
    }

    const xData = memoryData[0]?.xData?.map(String) || [];
    const yData =
      memoryData.map((item) => ({
        name: item?.name || 'unknown',
        type: 'line',
        data: item?.yData?.map((value) => (value === null ? null : Number(value))) || []
      })) || [];

    return {
      xData,
      yData
    };
  }, [memoryData]);

  // cpu chart data - include all pods (active and deprecated) for chart display
  const cpuChartData = useMemo(() => {
    if (!cpuData?.length) {
      return {
        xData: [] as string[],
        yData: [] as { name: string; type: string; data: Array<number | null> }[]
      };
    }

    const xData = cpuData[0]?.xData?.map(String) || [];
    const yData =
      cpuData.map((item) => ({
        name: item?.name || 'unknown',
        type: 'line',
        data: item?.yData?.map((value) => (value === null ? null : Number(value))) || []
      })) || [];

    return {
      xData,
      yData
    };
  }, [cpuData]);

  // storage chart data
  const storageChartData = useMemo(() => {
    const selectedPods = podList.filter((pod) => pod.checked);
    const filteredData = storageData?.filter((item) =>
      selectedPods.some((pod) => item?.name?.endsWith(pod.value))
    );

    if (filteredData?.length === 0) {
      return {
        xData: [] as string[],
        yData: [] as { name: string; type: string; data: Array<number | null> }[]
      };
    }

    const xData = filteredData?.[0]?.xData?.map(String) || [];
    const yData =
      filteredData?.map((item) => ({
        name: item?.name || 'unknown',
        type: 'line',
        data: item?.yData?.map((value) => (value === null ? null : Number(value))) || []
      })) || [];

    return {
      xData,
      yData
    };
  }, [storageData, podList]);

  // get the latest refresh time from all queries
  const lastRefreshTime = useMemo(() => {
    const times = [
      memoryDataUpdatedAt,
      cpuDataUpdatedAt,
      storageDataUpdatedAt,
      networkCountDataUpdatedAt,
      networkPercentDataUpdatedAt
    ].filter(Boolean);
    return times.length > 0 ? Math.max(...times) : undefined;
  }, [
    memoryDataUpdatedAt,
    cpuDataUpdatedAt,
    storageDataUpdatedAt,
    networkCountDataUpdatedAt,
    networkPercentDataUpdatedAt
  ]);

  // refetch data
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
    refetchNetworkCountData();
    refetchNetworkPercentData();
  };

  return (
    <DetailLayout appName={appName} key={'monitor'}>
      <div className="flex flex-col flex-1 h-full min-h-0 overflow-y-auto scrollbar-hide gap-2">
        <div className="bg-white flex flex-col shrink-0 border-[0.5px] border-zinc-200 rounded-xl shadow-xs">
          <Header
            podList={podList}
            setPodList={setPodList}
            refetchData={refetchData}
            lastRefreshTime={lastRefreshTime}
            currentTab={currentTab}
            availableNetworks={availableNetworks}
            selectedNetworkIndex={selectedNetworkIndex}
            setSelectedNetworkIndex={setSelectedNetworkIndex}
          />
        </div>
        <div className="bg-white flex-1 h-fit flex flex-col border-[0.5px] border-zinc-200 rounded-xl shadow-xs">
          <Tabs
            value={currentTab}
            onValueChange={(value: string) => setCurrentTab(value as MonitorTab)}
            className="w-full h-full flex flex-col flex-1 gap-0"
          >
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
            <TabsContent value="performance" className="p-0 flex flex-col flex-1 h-full">
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
                          yAxisLabelFormatter={percentFormatter}
                          yAxisConfig={{
                            min: 0,
                            max: getPercentAxisMax
                          }}
                          appName={appName}
                          type="cpu"
                          activePodNames={activePodNames}
                          checkedPodNames={checkedPodNames}
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
                          yAxisLabelFormatter={percentFormatter}
                          yAxisConfig={{
                            min: 0,
                            max: getPercentAxisMax
                          }}
                          appName={appName}
                          type="memory"
                          activePodNames={activePodNames}
                          checkedPodNames={checkedPodNames}
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
            <TabsContent value="network" className="p-0 flex flex-col flex-1 h-full">
              {!isNetworkCountLoading && !isNetworkPercentLoading ? (
                networkInfo.serviceName && networkInfo.port ? (
                  <div className="flex flex-col flex-1 min-h-0">
                    <div className="border-b border-zinc-200 px-10 py-8 flex flex-col gap-5 flex-1 h-full min-h-0">
                      <div className="flex items-center justify-between">
                        <div className="text-base font-medium text-zinc-900">
                          {t('network_request_percent')} (%)
                        </div>
                      </div>
                      <div className="flex-1 min-h-[200px] relative">
                        {networkPercentChartData?.yData?.length > 0 ? (
                          <MonitorChart
                            data={networkPercentChartData}
                            title={'chartTitle'}
                            unit="%"
                            yAxisLabelFormatter={percentFormatter}
                            appName={appName}
                            type="network"
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
                          {t('network_request_count')} (
                          <span className="font-normal text-zinc-500">{networkTotalCount}</span>)
                        </div>
                      </div>
                      <div className="flex-1 min-h-[200px] relative">
                        {networkCountChartData?.yData?.length > 0 ? (
                          <MonitorChart
                            data={networkCountChartData}
                            title={'chartTitle'}
                            unit=""
                            appName={appName}
                            type="network"
                            yAxisUseNative
                            yAxisConfig={{
                              min: 0,
                              max: getPaddedAxisMax
                            }}
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
                  <div className="flex flex-col flex-1 min-h-0 items-center justify-center">
                    <div className="h-10 w-10 flex items-center justify-center border border-dashed border-zinc-200 rounded-xl">
                      <LineChart className="w-6 h-6 text-zinc-400 stroke-[1.5px]" />
                    </div>
                    <div className="text-zinc-900 text-sm font-semibold mt-3">
                      {t('no_network_configured')}
                    </div>
                  </div>
                )
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
            <TabsContent value="storage" className="p-0 flex flex-col flex-1 h-full">
              {!isLoading ? (
                <div className="px-10 py-8 flex flex-col gap-5 flex-1 h-full min-h-0">
                  <div className="flex items-center justify-between">
                    <div className="text-base font-medium text-zinc-900">
                      {t('storage_usage')} (
                      <span className="font-normal text-zinc-500">{storageLatestValue}%</span>)
                    </div>
                  </div>
                  <div className="flex-1 min-h-[200px] relative">
                    {storageChartData?.yData?.length > 0 ? (
                      <MonitorChart
                        data={storageChartData}
                        title={'chartTitle'}
                        unit="%"
                        yAxisLabelFormatter={percentFormatter}
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
