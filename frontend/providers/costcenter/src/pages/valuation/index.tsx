import CpuIcon from '@/components/icons/CpuIcon';
import { MemoryIcon } from '@/components/icons/MemoryIcon';
import { NetworkIcon } from '@/components/icons/NetworkIcon';
import NvidiaIcon from '@/components/icons/NvidiaIcon';
import { PortIcon } from '@/components/icons/PortIcon';
import { StorageIcon } from '@/components/icons/StorageIcon';
import RegionMenu from '@/components/menu/RegionMenu';
import CalculatorPanel from '@/components/valuation/CalculatorPanel';
import CycleMenu from '@/components/valuation/CycleMenu';
import { PriceTablePanel } from '@/components/valuation/PriceTablePanel';
import { valuationMap } from '@/constants/payment';
import { CYCLE } from '@/constants/valuation';
import request from '@/service/request';
import useBillingStore from '@/stores/billing';
import { ApiResp } from '@/types/api';
import { ValuationStandard } from '@/types/valuation';
import { SubscriptionPlan } from '@/types/plan';
import { SubscriptionPlansPanel } from '@/components/valuation/SubscriptionPlansPanel';
import { getPlanList } from '@/api/plan';
import { Flex, Img, Stack, Tab, TabList, TabPanels, Tabs } from '@chakra-ui/react';
import { QueryClient, dehydrate, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useMemo, useState } from 'react';

type CardItem = {
  title: string;
  price: number;
  unit: string;
  idx: number; // used to sort
  icon: typeof Img;
  isGpu: boolean;
};
// 1 ,24,
export const PRICE_CYCLE_SCALE = [1, 24, 168, 720, 8760];

const getValuation = (regionUid: string) =>
  request.post<any, ApiResp<{ properties: ValuationStandard[] }>>('/api/properties', {
    regionUid
  });

function Valuation() {
  const { t } = useTranslation();
  const [cycleIdx, setCycleIdx] = useState(0);
  const [tabIdx, setTabIdx] = useState(0);
  const { getRegion } = useBillingStore();
  const regionUid = getRegion()?.uid || '';
  const { data: _data } = useQuery(['valuation', regionUid], () => getValuation(regionUid), {
    // staleTime: 1000 * 60 * 60 * 24
  });

  const { data: plansData } = useQuery(['plans'], () => getPlanList(), {
    staleTime: 1000 * 60 * 5 // 5 minutes
  });
  const data = useMemo(
    () =>
      _data?.data?.properties
        // ?.filter((x) => !x.name.startsWith('gpu-'))
        ?.flatMap<CardItem>((x) => {
          let props = valuationMap.get(x.name as any);
          if (!props) {
            if (!x.name.startsWith('gpu-')) return [];
            const gpuprops = valuationMap.get('gpu');
            if (!gpuprops) return [];
            props = gpuprops;
          }
          let icon: typeof Img;
          let isGpu = x.name.startsWith('gpu-');
          let title = x.name;
          let unit = [t(props.unit), t(CYCLE[cycleIdx])].join('/');
          if (x.name === 'cpu') icon = CpuIcon;
          else if (x.name === 'memory') icon = MemoryIcon;
          else if (x.name === 'network') {
            icon = NetworkIcon;
            unit = '/' + t(props.unit);
          } else if (x.name === 'storage') icon = StorageIcon;
          else if (x.name === 'services.nodeports') {
            icon = PortIcon;
            title = 'Port';
          } else if (x.name.startsWith('gpu-')) {
            icon = NvidiaIcon;
            x.alias && (title = x.alias);
          } else return [];
          const price = (x.unit_price || 0) * (props.scale || 1);
          return [
            {
              title,
              price,
              unit,
              idx: props.idx,
              icon,
              isGpu
            }
          ];
        })
        .sort((a, b) => a.idx - b.idx) || [],
    [_data, t, cycleIdx]
  );
  const PriceTableData = useMemo(
    () =>
      data.map((d) => {
        let priceCycleScale = PRICE_CYCLE_SCALE[cycleIdx];
        if (d.title === 'network') priceCycleScale = 1;
        return {
          ...d,
          price: (d.price || 0) * priceCycleScale
        };
      }),
    [data, cycleIdx]
  );
  return (
    <Flex w="100%" h="100%" overflow={'auto'} bg={'white'}>
      <Stack
        flex={1}
        alignItems="center"
        minWidth={'max-content'}
        // px={'24px'}
        py={'20px'}
        // w={'full'}
        borderRadius={'4px'}
      >
        、
        <Tabs
          flex={1}
          display={'flex'}
          flexDir={'column'}
          w={'full'}
          minW={'max-content'}
          variant={'primary'}
          tabIndex={tabIdx}
          onChange={(idx) => {
            setTabIdx(idx);
          }}
        >
          <TabList mx={'24px'}>
            <Tab>{t('Subscription Plans')}</Tab>
            <Tab>{t('Price Table')}</Tab>
            <Tab>{t('price_calculator')}</Tab>

            <Flex ml="auto" gap={'12px'}>
              <RegionMenu isDisabled={false} />
              {tabIdx === 0 && <CycleMenu cycleIdx={cycleIdx} setCycleIdx={setCycleIdx} mr={'0'} />}
            </Flex>
          </TabList>
          <TabPanels minW={'max-content'}>
            <SubscriptionPlansPanel plansData={plansData?.data?.plans} />
            <PriceTablePanel priceData={PriceTableData} />
            <CalculatorPanel priceData={data} />
          </TabPanels>
        </Tabs>
      </Stack>
    </Flex>
  );
}

export default Valuation;

export async function getServerSideProps({ locale }: { locale: string }) {
  const queryClient = new QueryClient();
  await Promise.all([
    queryClient.prefetchQuery(['valuation'], () => getValuation('')),
    queryClient.prefetchQuery(['plans'], () => getPlanList())
  ]);
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'], null, ['zh', 'en'])),
      dehydratedState: dehydrate(queryClient)
    }
  };
}
