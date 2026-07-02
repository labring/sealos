import objectStorageIcon from '@/assert/objectstorage.svg';
import { UserQuotaItemType } from '@/pages/api/getQuota';
import request from '@/service/request';
import useEnvStore from '@/stores/env';
import { ApiResp } from '@/types';
import { Box, Divider, HStack, Img, Stack, StackProps, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import CpuIcon from '../icons/CpuIcon';
import GpuIcon from '../icons/GpuIcon';
import { MemoryIcon } from '../icons/MemoryIcon';
import { NodeIcon } from '../icons/NodeIcon';
import { PortIcon } from '../icons/PortIcon';
import { StorageIcon } from '../icons/StorageIcon';
const QuotaPie = dynamic(() => import('../cost_overview/components/quotaPieChart'), { ssr: false });

const ObjectStorageIcon = (props: any) => (
  <Img src={objectStorageIcon.src} boxSize={'16px'} {...props} />
);

type QuotaMeta = {
  unit: string;
  bg: string;
  icon: ComponentType<any>;
  pieTitle?: string;
};

const quotaMeta: Record<UserQuotaItemType['type'], QuotaMeta> = {
  cpu: { unit: 'Core', bg: '#33BABB', icon: CpuIcon },
  memory: { unit: 'GB', bg: '#36ADEF', icon: MemoryIcon },
  storage: { unit: 'GB', bg: '#9A8EE0', icon: StorageIcon },
  'ephemeral-storage': { unit: 'GB', bg: '#7A8BEA', icon: StorageIcon },
  gpu: { unit: 'GPU Unit', bg: '#6FCA88', icon: GpuIcon },
  pods: { unit: 'pod_unit', bg: '#2EB67D', icon: NodeIcon },
  'services.nodeports': { unit: 'port_unit', bg: '#8774EE', icon: PortIcon },
  'objectstorage/bucket': {
    unit: 'bucket_unit',
    bg: '#E6A23C',
    icon: ObjectStorageIcon,
    pieTitle: 'objectstorage/bucket_short'
  },
  'objectstorage/size': {
    unit: 'GB',
    bg: '#F182AA',
    icon: ObjectStorageIcon,
    pieTitle: 'objectstorage/size_short'
  }
};

const formatQuotaValue = (value: number) => Number(value.toFixed(3));

export default function Quota({
  namespace,
  ...props
}: StackProps & {
  namespace?: string;
}) {
  const { t } = useTranslation();
  const { data } = useQuery(['quota', namespace], () =>
    request<any, ApiResp<{ quota: UserQuotaItemType[] }>>('/api/getQuota', {
      method: 'POST',
      data: {
        namespace
      }
    })
  );
  const { gpuEnabled } = useEnvStore();
  const quota = (data?.data?.quota || [])
    .filter((d) => gpuEnabled || d.type !== 'gpu')
    .flatMap((d) => {
      const entity = quotaMeta[d.type];
      if (!entity) {
        return [];
      }
      const remain = Math.max(0, d.limit - d.used);
      return [
        {
          ...d,
          limit: formatQuotaValue(d.limit),
          used: formatQuotaValue(d.used),
          remain: formatQuotaValue(remain),
          title: t(d.type),
          pieTitle: t(entity.pieTitle || d.type),
          unit: t(entity.unit),
          bg: entity.bg,
          Icon: entity.icon
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
              <item.Icon color={'grayModern.600'} boxSize={'20px'} />
              <Text fontSize={'16px'} fontWeight="500" color={'grayModern.900'}>
                {item.title}
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
