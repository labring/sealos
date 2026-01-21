import { useTranslation } from 'next-i18next';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '@/store/app';
import { serviceSideProps } from '@/utils/i18n';
import DetailLayout from '@/components/layouts/DetailLayout';
import { Header } from '@/components/app/detail/logs/Header';
import { Filter } from '@/components/app/detail/logs/Filter';
import { LogTable } from '@/components/app/detail/logs/LogTable';
import { LogCounts } from '@/components/app/detail/logs/LogCounts';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ListItem } from '@/components/AdvancedSelect';
import useDateTimeStore from '@/store/date';
import { getAppLogs, getLogPodList } from '@/api/app';
import { useForm } from 'react-hook-form';
import { formatTimeRange, parseTimeRange } from '@/utils/timeRange';
import { downLoadBold, formatTime } from '@/utils/tools';
import { useLogStore } from '@/store/logStore';
import { useRouter } from 'next/router';
import { track } from '@sealos/gtm';

export interface JsonFilterItem {
  key: string;
  value: string;
  mode: '=' | '!=' | '~' | '!~';
}

export interface LogsFormData {
  pods: ListItem[];
  containers: ListItem[];
  limit: number;
  keyword: string;
  isJsonMode: boolean;
  isOnlyStderr: boolean;
  jsonFilters: JsonFilterItem[];
  refreshInterval: number;
  filterKeys: {
    value: string;
    label: string;
  }[];
}

export default function LogsPage({ appName }: { appName: string }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { appDetail, appDetailPods } = useAppStore();

  const {
    refreshInterval,
    setRefreshInterval,
    startDateTime,
    endDateTime,
    setStartDateTime,
    setEndDateTime,
    isManualRange,
    autoRange
  } = useDateTimeStore();
  const { setLogs, exportLogs, parsedLogs, logCounts, setLogCounts } = useLogStore();

  useEffect(() => {
    track('module_view', {
      module: 'applaunchpad',
      view_name: 'logs'
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

  const formHook = useForm<LogsFormData>({
    defaultValues: {
      pods: [],
      containers: [],
      limit: 100,
      keyword: '',
      isJsonMode: false,
      isOnlyStderr: false,
      jsonFilters: [],
      refreshInterval: 0
    }
  });

  const selectedPods = formHook.watch('pods').filter((pod) => pod.checked);
  const jsonFilters = formHook
    .watch('jsonFilters')
    .filter((item) => item.key && item.key.trim() !== '');

  const timeRange = formatTimeRange(startDateTime, endDateTime);

  const allPods = formHook.watch('pods');

  // Build the pod -> containers mapping
  const podContainerMap = useMemo(() => {
    const podToContainers = new Map<string, Set<string>>();

    appDetailPods?.forEach((pod) => {
      const podName = pod.metadata?.name;
      if (!podName) return;

      const containers = pod.spec?.containers || [];
      const containerNames = containers.map((c) => c.name);

      podToContainers.set(podName, new Set(containerNames));
    });

    return podToContainers;
  }, [appDetailPods]);

  // When container selection changes, update pod selection
  const onContainerChange = useCallback(
    (newContainers: ListItem[]) => {
      formHook.setValue('containers', newContainers);

      const currentPods = formHook.getValues('pods');
      const checkedContainerNames = new Set(
        newContainers.filter((c) => c.checked).map((c) => c.value)
      );
      const hasAnyContainerChecked = checkedContainerNames.size > 0;

      // Update pod selection based on container selection
      const updatedPods = currentPods.map((pod) => {
        const podContainers = podContainerMap.get(pod.value);

        // For non-active pods (no container mapping):
        // - If no container is selected, uncheck the pod
        // - If any container is selected, keep the pod's current state
        if (!podContainers) {
          return hasAnyContainerChecked ? pod : { ...pod, checked: false };
        }

        // For active pods: check if any of its containers is selected
        const hasCheckedContainer = Array.from(podContainers).some((containerName) =>
          checkedContainerNames.has(containerName)
        );

        return { ...pod, checked: hasCheckedContainer };
      });

      formHook.setValue('pods', updatedPods);
    },
    [formHook, podContainerMap]
  );

  // Compute the pod params for API (pods only, no containers)
  const podParam = useMemo(() => {
    // When none selected, pass a placeholder so backend returns empty
    if (selectedPods.length === 0 && allPods.length > 0) {
      return ['__none__'];
    }
    // When all selected, pass empty array (backend returns all)
    if (selectedPods.length === allPods.length) {
      return [];
    }
    // When partially selected, pass the selected pods
    return selectedPods.map((pod) => pod.value);
  }, [selectedPods, allPods]);

  const { isLoading, refetch: refetchLogsData } = useQuery(
    [
      'logs-data',
      appName,
      startDateTime.getTime(),
      endDateTime.getTime(),
      formHook.watch('limit'),
      formHook.watch('isJsonMode'),
      formHook.watch('keyword'),
      podParam
    ],
    () =>
      getAppLogs({
        // time: timeRange,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        app: appName,
        limit: formHook.watch('limit').toString(),
        jsonMode: formHook.watch('isJsonMode').toString(),
        keyword: formHook.watch('keyword'),
        pod: podParam,
        container: [],
        jsonQuery: jsonFilters
      }),
    {
      retry: 1,
      staleTime: 3000,
      cacheTime: 3000,
      refetchInterval: refreshInterval,
      onError: (error: any) => {
        console.log(error, 'error');
        setRefreshInterval(0);
      },
      onSuccess: (data) => {
        setLogs(data);
      }
    }
  );

  // Log counts
  const { refetch: refetchLogCountsData, isLoading: isLogCountsLoading } = useQuery(
    [
      'log-counts-data',
      appName,
      startDateTime.getTime(),
      endDateTime.getTime(),
      podParam,
      formHook.watch('isJsonMode'),
      formHook.watch('keyword')
    ],
    () =>
      getAppLogs({
        app: appName,
        numberMode: 'true',
        numberLevel: timeRange.slice(-1),
        jsonMode: formHook.watch('isJsonMode').toString(),
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        pod: podParam,
        container: [],
        jsonQuery: jsonFilters,
        keyword: formHook.watch('keyword')
      }),
    {
      refetchInterval: refreshInterval,
      staleTime: 3000,
      cacheTime: 3000,
      onSuccess: (data) => {
        setLogCounts(data);
      }
    }
  );

  const { refetch: refetchPodListData, isLoading: isPodListLoading } = useQuery(
    [
      'log-pod-list-data',
      appName,
      startDateTime.getTime(),
      endDateTime.getTime(),
      appDetailPods?.length
    ],
    () =>
      getLogPodList({
        // time: timeRange
        app: appName,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString()
      }),
    {
      staleTime: 3000,
      cacheTime: 3000,
      onSuccess: (data) => {
        console.log('isInitialized', appDetailPods);

        if (appDetailPods?.length > 0) {
          const podList = Array.isArray(data) ? data : [];
          const urlPodName = router.query.pod as string | undefined;

          // Get active pod names from appDetailPods
          const activePodNames = new Set(
            appDetailPods.map((pod) => pod.metadata?.name).filter((name): name is string => !!name)
          );

          const podNamesSet = new Set([...podList, ...activePodNames]);

          const prevPods = formHook.getValues('pods');
          const hasPrevPods = prevPods.length > 0;
          const checkedMap = new Map(prevPods.map((pod) => [pod.value, pod.checked]));

          const newPods: ListItem[] = Array.from(podNamesSet).map((podName) => ({
            value: podName,
            label: podName,
            checked: hasPrevPods
              ? checkedMap.get(podName) ?? true
              : urlPodName
              ? podName === urlPodName
              : true,
            isActive: activePodNames.has(podName)
          }));

          formHook.setValue('pods', newPods);

          const prevContainers = formHook.getValues('containers');
          const hasPrevContainers = prevContainers.length > 0;
          const containerCheckedMap = new Map(
            prevContainers.map((container) => [container.value, container.checked])
          );

          const containers = appDetailPods
            .flatMap((pod) => pod.spec?.containers || [])
            .map((container) => ({
              value: container.name,
              label: container.name,
              checked: hasPrevContainers ? containerCheckedMap.get(container.name) ?? true : true
            }))
            .filter((item, index, self) => index === self.findIndex((t) => t.value === item.value));
          formHook.setValue('containers', containers);
        }
      }
    }
  );

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
    refetchLogsData();
    refetchLogCountsData();
    refetchPodListData();
  };

  return (
    <DetailLayout appName={appName} key={'logs'}>
      <div className="flex flex-col flex-1 rounded-lg overflow-y-auto scrollbar-hide gap-2">
        <div className="bg-white flex flex-col border-[0.5px] border-zinc-200 rounded-xl shadow-xs">
          <Header
            formHook={formHook}
            refetchData={refetchData}
            onContainerChange={onContainerChange}
          />
          <div className="h-px bg-zinc-200" />
          <Filter formHook={formHook} refetchData={refetchData} />
        </div>
        <div className="bg-white border-[0.5px] border-zinc-200 rounded-xl shadow-xs shrink-0">
          <LogCounts logCountsData={logCounts || []} isLogCountsLoading={isLogCountsLoading} />
        </div>
        <div className="bg-white border-[0.5px] border-zinc-200 rounded-xl flex-1 max-h-[calc(100vh-108px)]">
          <LogTable data={parsedLogs || []} isLoading={isLoading} formHook={formHook} />
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
