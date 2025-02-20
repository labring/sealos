import { useTranslation } from 'next-i18next';
import { useQuery } from '@tanstack/react-query';
import { Box, useTheme, Flex, Divider } from '@chakra-ui/react';
import { useAppStore } from '@/store/app';
import { serviceSideProps } from '@/utils/i18n';
import DetailLayout from '@/components/layouts/DetailLayout';
import { Header } from '@/components/app/detail/logs/Header';
import { Filter } from '@/components/app/detail/logs/Filter';
import { LogTable } from '@/components/app/detail/logs/LogTable';
import { LogCounts } from '@/components/app/detail/logs/LogCounts';
import { useEffect, useMemo, useState } from 'react';
import { ListItem } from '@/components/AdvancedSelect';
import useDateTimeStore from '@/store/date';
import { getAppLogs, getLogPodList } from '@/api/app';
import { useForm } from 'react-hook-form';
import { formatTimeRange } from '@/utils/timeRange';
import { downLoadBold } from '@/utils/tools';
import { useLogStore } from '@/store/logStore';
import { useRouter } from 'next/router';
import { useMessage } from '@sealos/ui';

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
  const theme = useTheme();
  const router = useRouter();
  const { message } = useMessage();
  const { t } = useTranslation();
  const { appDetail, appDetailPods } = useAppStore();

  const { refreshInterval, setRefreshInterval, startDateTime, endDateTime } = useDateTimeStore();
  const { setLogs, exportLogs, parsedLogs, logCounts, setLogCounts } = useLogStore();

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
  const selectedContainers = formHook.watch('containers').filter((container) => container.checked);
  const jsonFilters = formHook
    .watch('jsonFilters')
    .filter((item) => item.key && item.key.trim() !== '');
  const timeRange = formatTimeRange(startDateTime, endDateTime);

  const { isLoading, refetch: refetchLogsData } = useQuery(
    [
      'logs-data',
      appName,
      timeRange,
      formHook.watch('isOnlyStderr'),
      formHook.watch('limit'),
      formHook.watch('isJsonMode'),
      formHook.watch('keyword'),
      selectedPods,
      selectedContainers
    ],
    () =>
      getAppLogs({
        time: timeRange,
        app: appName,
        stderrMode: formHook.watch('isOnlyStderr').toString(),
        limit: formHook.watch('limit').toString(),
        jsonMode: formHook.watch('isJsonMode').toString(),
        keyword: formHook.watch('keyword'),
        pod:
          selectedPods.length === formHook.watch('pods').length
            ? []
            : selectedPods.map((pod) => pod.value),
        container:
          selectedContainers.length === formHook.watch('containers').length
            ? []
            : selectedContainers.map((container) => container.value),
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

  // log counts
  const { refetch: refetchLogCountsData, isLoading: isLogCountsLoading } = useQuery(
    [
      'log-counts-data',
      appName,
      timeRange,
      formHook.watch('isOnlyStderr'),
      selectedPods,
      selectedContainers,
      formHook.watch('isJsonMode'),
      formHook.watch('keyword')
    ],
    () =>
      getAppLogs({
        app: appName,
        numberMode: 'true',
        numberLevel: timeRange.slice(-1),
        jsonMode: formHook.watch('isJsonMode').toString(),
        time: timeRange,
        stderrMode: formHook.watch('isOnlyStderr').toString(),
        pod:
          selectedPods.length === formHook.watch('pods').length
            ? []
            : selectedPods.map((pod) => pod.value),
        container:
          selectedContainers.length === formHook.watch('containers').length
            ? []
            : selectedContainers.map((container) => container.value),
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
    ['log-pod-list-data', appName, timeRange, appDetailPods?.length],
    () =>
      getLogPodList({
        app: appName,
        time: timeRange
      }),
    {
      staleTime: 3000,
      cacheTime: 3000,
      onSuccess: (data) => {
        console.log('isInitialized', appDetailPods);

        if (appDetailPods?.length > 0) {
          const podList = Array.isArray(data) ? data : [];
          const urlPodName = router.query.pod as string;

          const podNamesSet = new Set([
            ...podList,
            ...appDetailPods
              .map((pod) => pod.metadata?.name)
              .filter((name): name is string => !!name)
          ]);

          const allPods: ListItem[] = Array.from(podNamesSet).map((podName) => ({
            value: podName,
            label: podName,
            checked: urlPodName ? podName === urlPodName : true
          }));

          formHook.setValue('pods', allPods);

          const containers = appDetailPods
            .flatMap((pod) => pod.spec?.containers || [])
            .map((container) => ({
              value: container.name,
              label: container.name,
              checked: true
            }))
            .filter((item, index, self) => index === self.findIndex((t) => t.value === item.value));
          formHook.setValue('containers', containers);
        }
      }
    }
  );

  const refetchData = () => {
    message({
      title: t('refetching_success')
    });
    refetchLogsData();
    refetchLogCountsData();
    refetchPodListData();
  };

  return (
    <DetailLayout appName={appName}>
      <Flex flexDirection={'column'} flex={1} borderRadius="lg" overflowY={'auto'}>
        <Flex
          mb={'6px'}
          bg={'white'}
          flexDir={'column'}
          border={theme.borders.base}
          borderRadius={'lg'}
        >
          <Header formHook={formHook} refetchData={refetchData} />
          <Divider />
          <Filter formHook={formHook} refetchData={refetchData} />
        </Flex>
        <Box
          mb={'6px'}
          p={'20px 20px'}
          bg={'white'}
          border={theme.borders.base}
          borderRadius={'lg'}
          flexShrink={0}
        >
          <LogCounts logCountsData={logCounts || []} isLogCountsLoading={isLogCountsLoading} />
        </Box>
        <Box
          bg={'white'}
          p={'20px'}
          border={theme.borders.base}
          borderRadius={'lg'}
          flex={1}
          height={'0px'}
          minH={parsedLogs?.length > 0 ? '400px' : '200px'}
        >
          <LogTable data={parsedLogs || []} isLoading={isLoading} formHook={formHook} />
        </Box>
      </Flex>
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
