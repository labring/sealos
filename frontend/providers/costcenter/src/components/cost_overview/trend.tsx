import chart7 from '@/assert/Chart7.svg';
import Notfound from '@/components/notFound';
import request from '@/service/request';
import { Box, Divider, Flex, Heading, Img } from '@chakra-ui/react';
import { Separator } from '@sealos/shadcn-ui/separator';
import { useQuery } from '@tanstack/react-query';
import { subDays } from 'date-fns';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { memo, useMemo, useState } from 'react';
const LineChart = dynamic(() => import('./components/lineChart'), { ssr: false });

export const Trend = memo(function Trend() {
  const { t, i18n } = useTranslation();
  // const startTime = useOverviewStore((state) => state.startTime);
  // const endTime = useOverviewStore((state) => state.endTime);
  const [endTime] = useState(() => new Date());
  const startTime = subDays(endTime, 7);
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
  const arr = useMemo(
    () =>
      (data?.data || []).map<[[number, string][], string]>((v) => [
        v[0],
        i18n.language === 'zh' ? v[1].zh : v[1].en
      ]),
    [data?.data, i18n.language]
  );
  return (
    <div className="flex flex-col text-sm border rounded-2xl">
      <div className="flex px-6 items-center h-16 border-b">
        <div className="flex h-5 gap-2 items-center font-medium">
          <h3>{t('Cost Trend')}</h3>
          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:w-0.5 text-zinc-400"
          />
          <span className="text-zinc-500">{t('Last 7 days')}</span>
        </div>
      </div>
      <div className="px-8 py-4 flex flex-col items-center justify-center gap-4 h-[calc(300px+2rem)]">
        {isInitialLoading || !data ? (
          <>
            <Img src={chart7.src}></Img>
            <Notfound></Notfound>
          </>
        ) : (
          <LineChart data={arr} cycle={'Day'} startTime={startTime} endTime={endTime}></LineChart>
        )}
      </div>
    </div>
  );
});
