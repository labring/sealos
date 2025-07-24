import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';

import { useDevboxStore } from '@/stores/devbox';
import MonitorChart from '@/components/MonitorChart';

const LiveMonitoring = () => {
  const t = useTranslations();

  const { devboxDetail } = useDevboxStore();

  return (
    <div className="flex h-50 flex-col items-start gap-5 rounded-xl border-[0.5px] bg-white p-6 shadow-xs">
      {/* title */}
      <div className="flex w-full items-center justify-between">
        <span className="text-lg/7 font-medium">{t('live_monitoring')}</span>
        <span className="text-sm/5 text-neutral-400">
          {t('update Time')}&ensp;
          {dayjs().format('HH:mm')}
        </span>
      </div>
      {/* chart */}
      <div className="flex min-h-[100px] w-full gap-5">
        <div className="flex w-[18vw] flex-shrink-0 flex-grow-1 flex-col gap-2">
          <span className="text-sm/5 text-zinc-700">
            {t('cpu')}:&nbsp;
            {devboxDetail?.usedCpu?.yData[devboxDetail?.usedCpu?.yData?.length - 1]}%
          </span>
          <MonitorChart
            type="blue"
            data={devboxDetail?.usedCpu}
            isShowText={false}
            className="w-full"
          />
        </div>
        <div className="flex w-[18vw] flex-shrink-0 flex-grow-1 flex-col gap-2">
          <span className="text-sm/5 text-zinc-700">
            {t('memory')}:&nbsp;
            {devboxDetail?.usedMemory?.yData[devboxDetail?.usedMemory?.yData?.length - 1]}%
          </span>
          <MonitorChart
            type="green"
            data={devboxDetail?.usedMemory}
            isShowText={false}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default LiveMonitoring;
