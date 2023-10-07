import { valuationMap } from '@/constants/payment';
import { UserQuotaItemType } from '@/pages/api/getQuota';
import request from '@/service/request';
import useEnvStore from '@/stores/env';
import { ApiResp } from '@/types';
import { Flex, Stack } from '@chakra-ui/react';
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
    <Stack>
      {quota
        .filter((x) => gpuEnabled || x.type !== 'gpu')
        .map((item) => (
          <MyTooltip
            hasArrow={true}
            placement="top"
            key={item.type}
            label={`${t('Total Quota')}: ${item.limit} ${item.unit}
${t('Used Quota')}: ${item.used} ${item.unit}
${t('Remaining Quota')}: ${item.limit - item.used} ${item.unit}
`}
            whiteSpace={'pre-wrap'}
          >
            <Flex
              justify={'space-between'}
              align={'center'}
              mb="20px"
              fontSize={'12px'}
              textTransform={'capitalize'}
            >
              {t(item.type)}
              <Flex w="170px" h="7px" bg="#DEE0E2" borderRadius={'4px'} overflow={'hidden'}>
                <Flex
                  borderRadius={'4px'}
                  w={Math.floor((item.used * 100) / item.limit) + '%'}
                  bg={item.bg}
                />
              </Flex>
            </Flex>
          </MyTooltip>
        ))}
    </Stack>
  );
}
