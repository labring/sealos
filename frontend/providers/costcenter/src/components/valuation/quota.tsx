import { valuationMap } from '@/constants/payment';
import { UserQuotaItemType } from '@/pages/api/getQuota';
import request from '@/service/request';
import useEnvStore from '@/stores/env';
import { ApiResp } from '@/types';
import { Flex } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import MyTooltip from '../MyTooltip';

export default function Quota() {
  const { t } = useTranslation();
  const { data } = useQuery(['quota'], () =>
    request<any, ApiResp<{ quota: UserQuotaItemType[] }>>('/api/getQuota')
  );
  const quota = (data?.data?.quota || []).flatMap((_quota) => {
    const x = valuationMap.get(_quota.type);
    if (!x) return [];
    return [
      {
        ..._quota,
        unit: x.unit,
        bg: x.bg
      }
    ];
  });
  const gpuEnabled = useEnvStore((s) => s.gpuEnabled);
  return (
    <Flex borderX={'1px solid #DEE0E2'} borderRadius={'4px'} overflow={'hidden'}>
      {quota
        .filter((x) => gpuEnabled || x.type !== 'gpu')
        .map((item) => (
          <Flex
            key={item.type}
            flex={1}
            position="relative"
            borderX={'0.5px solid #DEE0E2'}
            borderY={'1px solid #DEE0E2'}
            bg={'#F1F4F6'}
            direction={'column'}
          >
            <Flex justify={'center'} align={'center'} h={'42px'} borderBottom={'1px solid #DEE0E2'}>
              {item.type}
            </Flex>
            <Flex justify={'center'} align={'center'} h={'68px'}>
              <MyTooltip
                hasArrow={true}
                placement="top"
                label={`${t('Total Quota')}: ${item.limit} ${item.unit}
${t('Used Quota')}: ${item.used} ${item.unit}
${t('Remaining Quota')}: ${item.limit - item.used} ${item.unit}
`}
                whiteSpace={'pre-wrap'}
              >
                <Flex w="168px" h="6px" bg="#DEE0E2" borderRadius={'4px'} overflow={'hidden'}>
                  <Flex
                    borderRadius={'4px'}
                    w={Math.floor((item.used * 100) / item.limit) + '%'}
                    bg={item.bg}
                  />
                </Flex>
              </MyTooltip>
            </Flex>
          </Flex>
        ))}
    </Flex>
  );
}
