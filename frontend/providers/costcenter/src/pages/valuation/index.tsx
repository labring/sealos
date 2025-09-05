import RegionMenu from '@/components/menu/RegionMenu';
import CycleMenu from '@/components/valuation/CycleMenu';
import { PriceTablePanel } from '@/components/valuation/PriceTablePanel';
import { valuationMap } from '@/constants/payment';
import { CYCLE } from '@/constants/valuation';
import request from '@/service/request';
import useBillingStore from '@/stores/billing';
import { ApiResp } from '@/types/api';
import { ValuationStandard } from '@/types/valuation';
import { SubscriptionPlansPanel } from '@/components/valuation/SubscriptionPlansPanel';
import { getPlanList } from '@/api/plan';
import { Flex, Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react';
import { QueryClient, dehydrate, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { FC, useMemo, useState } from 'react';
import { LucideIcon } from 'lucide-react';

type CardItem = {
  title: string;
  price: number;
  unit: string;
  idx: number; // used to sort
  icon: LucideIcon;
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
          // Let's handle the difference between valuationMap and the API
          let propKey = x.name;
          if (x.name === 'services.nodeports') {
            propKey = 'nodeport';
          }

          let props = valuationMap.get(propKey as any);
          if (!props) {
            if (!x.name.startsWith('gpu-')) return [];
            const gpuprops = valuationMap.get('gpu');
            if (!gpuprops) return [];
            props = gpuprops;
          }

          let isGpu = x.name.startsWith('gpu-');
          let title = x.name;
          let unit = [t(props.unit), t(CYCLE[cycleIdx])].join('/');

          if (x.name === 'network') {
            unit = '/' + t(props.unit);
          } else if (x.name === 'services.nodeports') {
            title = 'Port';
          } else if (x.name.startsWith('gpu-')) {
            x.alias && (title = x.alias);
          }

          const price = (x.unit_price || 0) * (props.scale || 1);
          return [
            {
              title,
              price,
              unit,
              idx: props.idx,
              icon: props.icon,
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
        {/* // [TODO] We chose to hide this tab */}
        {/* <Tab>{t('price_calculator')}</Tab> */}

        <Flex ml="auto" gap={'12px'}>
          {(tabIdx === 1 || tabIdx === 2) && <RegionMenu isDisabled={false} />}
          {tabIdx === 1 && <CycleMenu cycleIdx={cycleIdx} setCycleIdx={setCycleIdx} />}
        </Flex>
      </TabList>
      <TabPanels minW={'max-content'}>
        <TabPanel>
          <div className="border rounded-2xl bg-zinc-50 overflow-hidden">
            <SubscriptionPlansPanel plansData={plansData?.data?.plans} />
          </div>
        </TabPanel>
        <TabPanel>
          <PriceTablePanel priceData={PriceTableData} />
        </TabPanel>
      </TabPanels>
    </Tabs>
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
