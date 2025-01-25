import DetailLayout from '@/components/layouts/DetailLayout';
import { useToast } from '@/hooks/useToast';
import { useAppStore } from '@/store/app';
import { serviceSideProps } from '@/utils/i18n';
import { Box, Center, Skeleton, SkeletonText, Stack, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Monitor/Header';
import MonitorChart from '@/components/MonitorChart';
import { useEffect, useMemo, useState } from 'react';
import { ListItem } from '@/components/AdvancedSelect';
import useDateTimeStore from '@/store/date';
import { getAppMonitorData } from '@/api/app';
import EmptyChart from '@/components/Icon/icons/emptyChart.svg';

export default function MonitorPage({ appName }: { appName: string }) {
  const { toast } = useToast();
  const { appDetail, appDetailPods } = useAppStore();
  const { t } = useTranslation();
  const { startDateTime, endDateTime } = useDateTimeStore();
  const [podList, setPodList] = useState<ListItem[]>([]);
  const { refreshInterval } = useDateTimeStore();

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
      const lastValue = Number(pod.yData[pod.yData.length - 1]);
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

  const cpuLatestAvg = useMemo(() => {
    if (!cpuData?.length) return 0;

    const sum = cpuData.reduce((acc, pod) => {
      const lastValue = Number(pod.yData[pod.yData.length - 1]);
      return acc + lastValue;
    }, 0);

    return (sum / cpuData.length).toFixed(2);
  }, [cpuData]);

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

    const xData = filteredData?.[0]?.xData.map(String) || [];
    const yData =
      filteredData?.map((item) => ({
        name: item.name || 'unknown',
        type: 'line',
        data: item.yData.map(Number)
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

    const xData = filteredData?.[0]?.xData.map(String) || [];
    const yData =
      filteredData?.map((item) => ({
        name: item.name || 'unknown',
        type: 'line',
        data: item.yData.map(Number)
      })) || [];

    return {
      xData,
      yData
    };
  }, [cpuData, podList]);

  const refetchData = () => {
    refetchCpuData();
    refetchMemoryData();
  };

  return (
    <DetailLayout appName={appName} key={'monitor'}>
      <Box
        minH={'100%'}
        flex={'1 0 0'}
        bg="white"
        borderRadius="8px"
        py={'16px'}
        px={'24px'}
        overflow={'auto'}
      >
        <Header podList={podList} setPodList={setPodList} refetchData={refetchData} />
        {!isLoading ? (
          <>
            <Box mt={'20px'} fontSize={'14px'} fontWeight={'bold'} color={'#000000'}>
              CPU: {cpuLatestAvg}%
            </Box>
            <Box mt={'24px'} height={'242px'} position={'relative'}>
              {cpuChartData?.yData?.length > 0 ? (
                <MonitorChart data={cpuChartData} title={'chartTitle'} unit="%" />
              ) : (
                <Center height={'100%'} flexDirection={'column'} gap={'12px'}>
                  <EmptyChart />
                  <Text fontSize={'12px'} fontWeight={500} color={'grayModern.500'}>
                    {t('no_data_available')}
                  </Text>
                </Center>
              )}
            </Box>
            <Box mt={'20px'} fontSize={'14px'} fontWeight={'bold'} color={'#000000'}>
              Memory: {memoryLatestAvg}%
            </Box>
            <Box mt={'24px'} height={'200px'} position={'relative'}>
              {memoryChartData?.yData?.length > 0 ? (
                <MonitorChart data={memoryChartData} title={'chartTitle'} unit="%" />
              ) : (
                <Center height={'100%'} flexDirection={'column'} gap={'12px'}>
                  <EmptyChart />
                  <Text fontSize={'12px'} fontWeight={500} color={'grayModern.500'}>
                    {t('no_data_available')}
                  </Text>
                </Center>
              )}
            </Box>
          </>
        ) : (
          <Stack flex={1} bg={'white'} borderRadius={'8px'} py={'16px'}>
            <Skeleton
              startColor="white"
              endColor="grayModern.200"
              fadeDuration={0.6}
              width={'200px'}
              height={'40px'}
            />
            <Skeleton startColor="white" endColor="grayModern.200" fadeDuration={0.6} p={'20px'} />
            <SkeletonText
              startColor="white"
              endColor="grayModern.200"
              fadeDuration={0.6}
              mt="4"
              noOfLines={4}
              spacing="4"
              skeletonHeight="20px"
            />
          </Stack>
        )}
      </Box>
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
