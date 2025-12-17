import chart7 from '@/assert/Chart7.svg';
import Notfound from '@/components/notFound';
import request from '@/service/request';
import { Img } from '@chakra-ui/react';
import { Separator } from '@sealos/shadcn-ui/separator';
import { useQuery } from '@tanstack/react-query';
import { subMonths } from 'date-fns';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { memo, useMemo, useState } from 'react';
const BarChart = dynamic(() => import('./components/barChart'), { ssr: false });

export const TrendBar = memo(function Trend() {
  const { t, i18n } = useTranslation();
  // const startTime = useOverviewStore((state) => state.startTime);
  // const endTime = useOverviewStore((state) => state.endTime);
  const [endTime] = useState(() => new Date());
  const startTime = subMonths(endTime, 6);
  const { data, isInitialLoading } = useQuery({
    queryKey: ['billing', 'trend', { startTime, endTime }],
    queryFn: () => {
      return request.post<
        [
          [number, string][],
          {
            en: string;
            zh: string;
          }
        ][]
      >('/api/billing/costs', {
        startTime,
        endTime
      });
    }
  });
  const { data: rechareData } = useQuery({
    queryKey: ['billing', 'trend', 'recharge', { startTime, endTime }],
    queryFn: () => {
      return request.post<[number, number][]>('/api/billing/rechargeList', {
        startTime,
        endTime
      });
    }
  });
  const totalArr = useMemo(
    () =>
      (data?.data ? data.data[0][0] : []).map<[number, string]>(([date, val]) => [
        date * 1000,
        val
      ]),
    [data?.data]
  );
  const rechargeArr = rechareData?.data || [];
  const inOutData: [[number, string | number][], string][] = [
    [totalArr, t('common:total_expenditure')],
    [rechargeArr, t('common:total_recharge')]
  ];
  return (
    <div className="flex flex-col text-sm border rounded-2xl shadow-sm">
      <div className="flex px-6 items-center h-16 border-b">
        <div className="flex h-5 gap-2 items-center font-medium">
          <h3>{t('common:annual_income_and_expenditure')}</h3>
          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:w-0.5 text-zinc-400"
          />
          <span className="text-zinc-500">{t('common:last_6_months')}</span>
          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:w-0.5 text-zinc-400"
          />
          <span className="text-zinc-500">{t('common:all_regions')}</span>
        </div>
      </div>
      <div className="px-8 py-4 flex flex-col items-center justify-center gap-4 h-[calc(300px+2rem)]">
        {isInitialLoading || !data ? (
          <>
            <Img src={chart7.src}></Img>
            <Notfound></Notfound>
          </>
        ) : (
          <BarChart data={inOutData} startTime={startTime} endTime={endTime} />
        )}
      </div>
    </div>
  );
});
