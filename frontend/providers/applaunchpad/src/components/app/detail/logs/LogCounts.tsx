import MyIcon from '@/components/Icon';
import LogBarChart from '@/components/LogBarChart';
import { Button } from '@sealos/shadcn-ui/button';
import { Loading } from '@sealos/shadcn-ui/loading';
import { cn } from '@sealos/shadcn-ui';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import EmptyChart from '@/components/Icon/icons/emptyChart.svg';
import { ChevronRight, BarChart3 } from 'lucide-react';

export const LogCounts = ({
  logCountsData,
  isLogCountsLoading
}: {
  logCountsData: { logs_total: string; _time: string }[];
  isLogCountsLoading?: boolean;
}) => {
  const { t } = useTranslation();
  const [onOpenChart, setOnOpenChart] = useState(true);

  const processChartData = (rawData: Array<{ _time: string; logs_total: string }>) => {
    const sortedData = [...rawData].sort(
      (a, b) => new Date(a._time).getTime() - new Date(b._time).getTime()
    );
    const xData = sortedData.map((item) => Math.floor(new Date(item._time).getTime() / 1000));
    const yData = sortedData.map((item) => item.logs_total);

    return {
      xData,
      yData
    };
  };

  return (
    <div className="flex flex-col">
      <div className="px-5 py-4 h-16 flex items-center">
        <Button
          variant="ghost"
          className={cn(
            '!px-0 !py-0 gap-1 bg-transparent border-none text-zinc-900 font-medium text-base hover:text-blue-600'
          )}
          onClick={() => setOnOpenChart(!onOpenChart)}
        >
          <ChevronRight
            className={cn(
              'w-5 h-5 text-neutral-400 transition-transform rotate-90',
              onOpenChart && 'rotate-270'
            )}
          />
          {t('logNumber')}
        </Button>
      </div>
      {/* charts */}
      <div
        className={cn(
          'border-t border-zinc-200 relative w-full transition-all duration-200 ease-in-out overflow-hidden',
          onOpenChart ? 'p-8 min-h-[130px] max-h-[200px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        {isLogCountsLoading ? (
          <div className="h-[140px] w-full flex items-center justify-center">
            <Loading />
          </div>
        ) : logCountsData.length > 0 ? (
          <LogBarChart type="blue" data={processChartData(logCountsData)} visible={onOpenChart} />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center border border-dashed border-zinc-200 rounded-xl">
              <BarChart3 className="w-6 h-6 text-zinc-400 stroke-[1.5px]" />
            </div>
            <span className="text-zinc-900 text-sm font-semibold">{t('no_data_available')}</span>
          </div>
        )}
      </div>
    </div>
  );
};
