import { monitor } from '@/api/monitor';
import { useOssStore } from '@/store/ossStore';
import { Box, BoxProps, Flex } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { connect } from 'echarts';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { useTranslation } from 'next-i18next';
const LineChart = dynamic(() => import('./lineChart'), {
  ssr: false
});
const titles = [
  'minio_bucket_usage_object_total',
  'minio_bucket_usage_total_bytes',
  'minio_bucket_traffic_received_bytes',
  'minio_bucket_traffic_sent_bytes'
] as const;
const chartStyles = [
  {
    lineColor: 'rgba(54, 173, 239, 1)',
    areaColor: 'rgba(54, 173, 239, 0.1)',
    itemColor: 'rgba(54, 173, 239, 1)'
  },
  {
    lineColor: 'rgba(71, 200, 191, 1)',
    areaColor: 'rgba(108, 211, 204, 0.1)',
    itemColor: 'rgba(71, 200, 191, 1)'
  },
  {
    lineColor: 'rgba(154, 142, 224, 1)',
    areaColor: 'rgba(154, 142, 224, 0.1)',
    itemColor: 'rgba(154, 142, 224, 1)'
  },
  {
    lineColor: 'rgba(241, 130, 170, 1)',
    areaColor: 'rgba(241, 130, 170, 0.1)',
    itemColor: 'rgba(241, 130, 170, 1)'
  }
];
export default function DataMonitor({ ...styles }: BoxProps) {
  const currentBucket = useOssStore((s) => s.currentBucket);
  const { t } = useTranslation('file');
  const monitorQuery = useQuery({
    queryFn: () =>
      monitor({
        bucket: currentBucket!.name
      }),
    queryKey: [
      'monitor',
      {
        bucket: currentBucket?.name
      }
    ],
    refetchInterval: 60000
  });
  const data = useMemo(() => {
    const data: (string | number)[][][] = [];
    for (let i = 0; i < 4; i++) {
      data.push([['date', titles[i]]]);
    }
    if (monitorQuery.isSuccess && monitorQuery.data) {
      const _data = monitorQuery.data;
      for (let i = 0; i < 4; i++) {
        const curdata = _data?.[i]?.reduce<[number, string][]>((pre, cur) => {
          // single pool
          const column = cur.values.map<[number, string]>(([time, v]) => [time * 1000, v]);
          return [...pre, ...column];
        }, []);
        curdata.sort((a, b) => a[0] - b[0]);
        data[i].push(...curdata);
      }
    }
    return data;
  }, [monitorQuery.data]);
  return (
    <Box mt="32px" flex={'1 1 0'} h="0" overflowY={'auto'} {...styles}>
      <Flex
        gridGap={'16px'}
        justifyContent={'center'}
        alignItems={'center'}
        wrap={['wrap']}
        maxW={'1140px'}
      >
        {titles.map((title, idx) => (
          <Box key={title}>
            <LineChart
              title={t(title)}
              dimesion={title}
              source={data[idx]}
              styles={chartStyles[idx]}
              onChartReady={(instance) => {
                instance.group = 'group1';
                connect('group1');
              }}
            />
          </Box>
        ))}
      </Flex>
    </Box>
  );
}
