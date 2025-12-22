import { valuationMap } from '@/constants/payment';
import { UserQuotaItemType } from '@/pages/api/getQuota';
import request from '@/service/request';
import useEnvStore from '@/stores/env';
import { ApiResp } from '@/types';
import { Box, Divider, HStack, Stack, StackProps, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useTranslation } from 'react-i18next';
import CpuIcon from '../icons/CpuIcon';
import GpuIcon from '../icons/GpuIcon';
import { MemoryIcon } from '../icons/MemoryIcon';
import { StorageIcon } from '../icons/StorageIcon';
const QuotaPie = dynamic(() => import('../cost_overview/components/quotaPieChart'), { ssr: false });
export default function Quota(props: StackProps) {
  const { t } = useTranslation();
  const { data } = useQuery(['quota'], () =>
    request<any, ApiResp<{ quota: UserQuotaItemType[] }>>('/api/getQuota')
  );
  const { gpuEnabled } = useEnvStore();
  const quota = (data?.data?.quota || [])
    .filter((d) => gpuEnabled || d.type !== 'gpu')
    .flatMap((d) => {
      const entity = valuationMap.get(d.type);
      if (!entity) {
        return [];
      }
      // GPU is already in integer units, no need to multiply/divide by 1000
      const isGpu = d.type === 'gpu';
      const _limit = isGpu ? d.limit : Number.parseInt(d.limit * 1000 + '');
      const _used = isGpu ? d.used : Number.parseInt(d.used * 1000 + '');
      const remain = isGpu ? Math.max(0, d.limit - d.used) : Math.max(0, (_limit - _used) / 1000);
      return [
        {
          ...d,
          limit: isGpu ? d.limit : _limit / 1000,
          used: isGpu ? d.used : _used / 1000,
          remain: remain,
          title: t(d.type),
          unit: t(entity.unit),
          bg: entity.bg
        }
      ];
    });
  return (
    <Stack {...props}>
      {quota.map((item) => (
        <HStack key={item.type} gap={'30px'}>
          <QuotaPie data={item} color={item.bg} />
          <Box>
            <HStack>
              {item.type === 'cpu' ? (
                <CpuIcon color={'grayModern.600'} boxSize={'20px'} />
              ) : item.type === 'memory' ? (
                <MemoryIcon color={'grayModern.600'} boxSize={'20px'} />
              ) : item.type === 'storage' ? (
                <StorageIcon color={'grayModern.600'} boxSize={'20px'} />
              ) : item.type === 'gpu' ? (
                <GpuIcon color={'grayModern.600'} boxSize={'20px'} />
              ) : (
                <></>
              )}
              <Text fontSize={'16px'} fontWeight="500" color={'grayModern.900'}>
                {t(item.type)}
              </Text>
            </HStack>
            <HStack fontSize={'14px'} gap="10px">
              <Text size={'sm'} color={'grayModern.600'}>
                {t('Used')}: {item.used}
                {item.unit}
              </Text>
              <Divider
                orientation={'vertical'}
                borderColor={'grayModern.600'}
                bgColor={'grayModern.500'}
                h={'10px'}
                borderWidth={'1px'}
              />
              <Text size={'sm'} color={'grayModern.600'}>
                {t('Remain')}: {item.remain}
                {item.unit}
              </Text>
              <Divider
                orientation={'vertical'}
                borderColor={'grayModern.600'}
                bgColor={'grayModern.500'}
                h={'10px'}
                borderWidth={'1px'}
              />
              <Text size={'sm'} color={'grayModern.600'}>
                {t('Total')}: {item.limit}
                {item.unit}
              </Text>
            </HStack>
          </Box>
        </HStack>
      ))}
    </Stack>
  );
}
