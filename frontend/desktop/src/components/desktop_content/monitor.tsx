import { getResource } from '@/api/platform';
import { Box, CircularProgress, CircularProgressLabel, Flex, Text } from '@chakra-ui/react';
import { MonitorIcon } from '@sealos/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { CpuIcon, FlowIcon, MemoryIcon, StorageIcon } from '../icons';
import { blurBackgroundStyles } from './index';

export default function Monitor({ needStyles = true }: { needStyles?: boolean }) {
  const { t } = useTranslation();
  const { data } = useQuery(['appListQuery'], getResource, {
    cacheTime: 5 * 60 * 1000
  });

  const info = [
    {
      label: 'CPU',
      value: data?.data?.totalCpu,
      icon: <CpuIcon />,
      unit: 'C'
    },
    {
      label: t('common:memory'),
      value: data?.data?.totalMemory,
      icon: <MemoryIcon />,
      unit: 'GB'
    },
    {
      label: t('common:storage'),
      value: data?.data?.totalStorage,
      icon: <StorageIcon />,
      unit: 'GB'
    },
    {
      label: t('common:flow'),
      value: `~`,
      icon: <FlowIcon />,
      unit: 'GB'
    }
  ];

  const totalPodCount = Number(data?.data?.totalPodCount) || 0;
  const runningPodCount = Number(data?.data?.runningPodCount) || 0;
  const runningPodPercentage =
    totalPodCount > 0 ? Math.round((runningPodCount / totalPodCount) * 100) : 0;

  return (
    <Flex
      flex={1}
      flexDirection={'column'}
      zIndex={2}
      py={'20px'}
      px={'16px'}
      {...(needStyles ? blurBackgroundStyles : {})}
    >
      {needStyles && (
        <Flex alignItems={'center'} gap={'6px'}>
          <MonitorIcon />
          <Text color={'rgba(255, 255, 255, 0.90)'} fontWeight={'bold'} fontSize={'14px'}>
            {t('common:monitor')}
          </Text>
        </Flex>
      )}

      <Flex alignItems={'center'} mt={'12px'} gap={'20px'}>
        <CircularProgress
          size={'90px'}
          trackColor={'#FF8398'}
          value={runningPodPercentage}
          color="#2BE0B3"
        >
          <CircularProgressLabel color={'white'} fontSize={'14px'} fontWeight={700}>
            {runningPodPercentage}%
          </CircularProgressLabel>
        </CircularProgress>
        <Flex
          flexDirection={'column'}
          color={'rgba(255, 255, 255, 0.90)'}
          fontSize={'12px'}
          fontWeight={500}
        >
          <Flex alignItems={'center'} gap={'8px'}>
            <Box bg={'#2BE0B3'} w={'7px'} h={'7px'} borderRadius={'2px'}></Box>
            <Text>{t('common:healthy_pod', { count: runningPodCount })}</Text>
          </Flex>
          <Flex alignItems={'center'} gap={'8px'}>
            <Box bg={'#FF8398'} w={'7px'} h={'7px'} borderRadius={'2px'}></Box>
            <Text>{t('common:alarm_pod', { count: totalPodCount - runningPodCount })}</Text>
          </Flex>
        </Flex>
      </Flex>
      <Text mt={'16px'} color={'rgba(255, 255, 255, 0.80)'} fontSize={'10px'} fontWeight={'bold'}>
        {t('common:used_resources')}
      </Text>
      <Flex mt={'8px'} flexWrap={'wrap'} gap={'8px'}>
        {info.map((item) => (
          <Box
            key={item.label}
            p={'12px'}
            width={'105px'}
            height={'72px'}
            bg={'rgba(255, 255, 255, 0.07)'}
            borderRadius={'6px'}
          >
            <Flex gap={'4px'}>
              {item.icon}
              <Text fontSize={'10px'} color={'rgba(255, 255, 255, 0.90)'} fontWeight={'bold'}>
                {item.label}
              </Text>
            </Flex>
            <Flex gap={'4px'} mt={'4px'} color={'white'} fontWeight={700} alignItems={'end'}>
              <Text fontSize={'18px'}>{item.value}</Text>
              <Text lineHeight={'20px'} fontSize={'10px'}>
                {item.unit}
              </Text>
            </Flex>
          </Box>
        ))}
      </Flex>
    </Flex>
  );
}
