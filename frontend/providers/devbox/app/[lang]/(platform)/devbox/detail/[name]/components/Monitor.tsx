import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';

import { useDevboxStore } from '@/stores/devbox';

import DatePicker from '@/components/DatePicker';
import MonitorChart from '@/components/MonitorChart';
import { generateMockMonitorData } from '@/constants/mock';

const Monitor = () => {
  const t = useTranslations();
  const { devboxDetail } = useDevboxStore();

  return (
    <div className="flex h-full flex-col items-start gap-2">
      {/* title */}
      <div className="flex w-full items-center justify-between rounded-xl border-[0.5px] bg-white p-6 shadow-xs">
        <div className="flex items-center gap-4">
          <span className="text-lg/7 font-medium">{t('filter')}</span>
          <DatePicker />
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
              type="blue"
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
