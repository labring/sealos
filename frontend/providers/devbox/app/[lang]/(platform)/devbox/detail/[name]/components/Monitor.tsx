import dayjs from 'dayjs';
import { useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';

import { useDevboxStore } from '@/stores/devbox';
import { useDateTimeStore } from '@/stores/date';

import DatePicker from '@/components/DatePicker';
import MonitorChart from '@/components/MonitorChart';
import { RefreshButton } from '@/components/RefreshButton';

const Monitor = () => {
  const params = useParams();
  const t = useTranslations();
  const { startDateTime, endDateTime } = useDateTimeStore();
  const { devboxDetail, loadDetailMonitorData } = useDevboxStore();

  const handleRefresh = useCallback(async () => {
    if (!params?.name) return;
    await loadDetailMonitorData(
      params.name as string,
      startDateTime.getTime(),
      endDateTime.getTime()
    );
  }, [params?.name, startDateTime, endDateTime, loadDetailMonitorData]);

  useEffect(() => {
    handleRefresh();
  }, []);

  return (
    <div className="flex h-full flex-1 flex-col items-start gap-2">
      {/* title */}
      <div className="flex w-full items-center justify-between rounded-xl border-[0.5px] bg-white p-6 shadow-xs">
        <div className="flex items-center gap-4">
          <span className="text-lg/7 font-medium">{t('filter')}</span>
          <DatePicker onClose={handleRefresh} />
          <RefreshButton onRefresh={handleRefresh} />
        </div>
        <span className="text-sm/5 text-neutral-500">
          {t('update Time')}&ensp;
          {dayjs().format('HH:mm')}
        </span>
      </div>
      {/* CPU */}
      <div className="flex h-full w-full justify-between self-stretch rounded-xl border-[0.5px] bg-white shadow-xs">
        <div className="flex flex-shrink-0 flex-grow-1 flex-col gap-2">
          <div className="flex w-full items-center justify-between border-b border-zinc-100 p-6 text-lg/7 font-medium text-black">
            <span>{t('cpu')}</span>
            <span>{devboxDetail?.usedCpu?.yData[devboxDetail?.usedCpu?.yData?.length - 1]}%</span>
          </div>
          <div className="h-full p-8">
            <MonitorChart
              type="blue"
              data={devboxDetail?.usedCpu}
              isShowText={false}
              splitNumber={4}
              className="w-full"
              isShowLabel
            />
          </div>
        </div>
      </div>
      {/* Memory */}
      <div className="flex h-full w-full justify-between self-stretch rounded-xl border-[0.5px] bg-white shadow-xs">
        <div className="flex flex-shrink-0 flex-grow-1 flex-col gap-2">
          <div className="flex w-full items-center justify-between border-b border-zinc-100 p-6 text-lg/7 font-medium text-black">
            <span>{t('memory')}</span>
            <span>
              {devboxDetail?.usedMemory?.yData[devboxDetail?.usedMemory?.yData?.length - 1]}%
            </span>
          </div>
          <div className="h-full p-8">
            <MonitorChart
              type="green"
              data={devboxDetail?.usedMemory}
              isShowText={false}
              splitNumber={4}
              className="w-full"
              isShowLabel
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Monitor;
