import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { subDays } from 'date-fns';

import { useDevboxStore } from '@/stores/devbox';
import { useDateTimeStore } from '@/stores/date';
import { DevboxStatusEnum } from '@/constants/devbox';
import { ALL_TIME_START_DATE } from '@/utils/timeRange';

import DatePicker from '@/components/DatePicker';
import MonitorChart from '@/components/MonitorChart';
import { RefreshButton } from '@/components/RefreshButton';
import { ScrollArea } from '@sealos/shadcn-ui/scroll-area';

const Monitor = () => {
  const params = useParams();
  const t = useTranslations();
  const { startDateTime, endDateTime, setStartDateTime, setEndDateTime } = useDateTimeStore();
  const { devboxDetail, loadDetailMonitorData } = useDevboxStore();
  const isRunning = devboxDetail?.status.value === DevboxStatusEnum.Running;
  const showGpuMonitor = !!devboxDetail?.gpu && (devboxDetail.gpu.amount || 0) > 0;
  const chartWrapperClass = 'h-[220px] p-8';

  const gpuMemoryMaxValue = useMemo(() => {
    const values =
      devboxDetail?.usedGpuMemory?.yData
        ?.map((value) => Number(value))
        .filter((value) => Number.isFinite(value)) || [];
    if (values.length === 0) return 100;
    const maxValue = Math.max(...values);
    if (!Number.isFinite(maxValue) || maxValue <= 0) return 1;
    return Math.ceil(maxValue * 1.1);
  }, [devboxDetail?.usedGpuMemory?.yData]);

  const getEffectiveMonitorRange = useCallback(() => {
    if (startDateTime.getTime() !== ALL_TIME_START_DATE.getTime()) {
      return { startTime: startDateTime, endTime: endDateTime };
    }

    const endTime = new Date();
    const startTime = subDays(endTime, 7);
    setStartDateTime(startTime);
    setEndDateTime(endTime);

    return { startTime, endTime };
  }, [endDateTime, setEndDateTime, setStartDateTime, startDateTime]);

  useEffect(() => {
    if (startDateTime.getTime() !== ALL_TIME_START_DATE.getTime()) return;
    const endTime = new Date();
    setStartDateTime(subDays(endTime, 7));
    setEndDateTime(endTime);
  }, [setEndDateTime, setStartDateTime, startDateTime]);

  const handleRefresh = useCallback(async () => {
    if (!params?.name) return;
    if (!isRunning) {
      toast.warning(t('refresh_requires_running'));
      return;
    }
    const { startTime, endTime } = getEffectiveMonitorRange();
    await loadDetailMonitorData(
      params.name as string,
      startTime.getTime(),
      endTime.getTime()
    );
  }, [params?.name, isRunning, getEffectiveMonitorRange, loadDetailMonitorData, t]);

  useEffect(() => {
    if (!isRunning) return;
    handleRefresh();
  }, [isRunning, handleRefresh]);

  return (
    <div className="flex h-full flex-1 min-h-0 flex-col items-start gap-2">
      {/* title */}
      <div className="flex w-full items-center justify-between rounded-xl border-[0.5px] bg-white p-6 shadow-xs">
        <div className="flex items-center gap-4">
          <span className="text-lg/7 font-medium">{t('filter')}</span>
          <DatePicker onClose={handleRefresh} showAllTime={false} />
          <RefreshButton onRefresh={handleRefresh} autoRefreshEnabled={isRunning} />
        </div>
        <span className="text-sm/5 text-neutral-500">
          {t('update Time')}&ensp;
          {dayjs().format('HH:mm')}
        </span>
      </div>
      <ScrollArea className="w-full flex-1 min-h-0 pr-1">
        <div className="flex w-full flex-col gap-2 pb-1">
          {/* CPU */}
          <div className="flex w-full justify-between self-stretch rounded-xl border-[0.5px] bg-white shadow-xs">
            <div className="flex flex-shrink-0 flex-grow-1 flex-col gap-2">
              <div className="flex w-full items-center justify-between border-b border-zinc-100 p-6 text-lg/7 font-medium text-black">
                <span>{t('cpu')}</span>
                <span>{devboxDetail?.usedCpu?.yData[devboxDetail?.usedCpu?.yData?.length - 1]}%</span>
              </div>
              <div className={chartWrapperClass}>
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
          <div className="flex w-full justify-between self-stretch rounded-xl border-[0.5px] bg-white shadow-xs">
            <div className="flex flex-shrink-0 flex-grow-1 flex-col gap-2">
              <div className="flex w-full items-center justify-between border-b border-zinc-100 p-6 text-lg/7 font-medium text-black">
                <span>{t('memory')}</span>
                <span>
                  {devboxDetail?.usedMemory?.yData[devboxDetail?.usedMemory?.yData?.length - 1]}%
                </span>
              </div>
              <div className={chartWrapperClass}>
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
          {showGpuMonitor && (
            <>
              {/* GPU */}
              <div className="flex w-full justify-between self-stretch rounded-xl border-[0.5px] bg-white shadow-xs">
                <div className="flex flex-shrink-0 flex-grow-1 flex-col gap-2">
                  <div className="flex w-full items-center justify-between border-b border-zinc-100 p-6 text-lg/7 font-medium text-black">
                    <span>{t('gpu_usage')}</span>
                    <span>
                      {devboxDetail?.usedGpu?.yData[devboxDetail?.usedGpu?.yData?.length - 1]}%
                    </span>
                  </div>
                  <div className={chartWrapperClass}>
                    <MonitorChart
                      type="blue"
                      data={devboxDetail?.usedGpu}
                      isShowText={false}
                      splitNumber={4}
                      className="w-full"
                      isShowLabel
                    />
                  </div>
                </div>
              </div>
              {/* GPU Memory */}
              <div className="flex w-full justify-between self-stretch rounded-xl border-[0.5px] bg-white shadow-xs">
                <div className="flex flex-shrink-0 flex-grow-1 flex-col gap-2">
                  <div className="flex w-full items-center justify-between border-b border-zinc-100 p-6 text-lg/7 font-medium text-black">
                    <span>{t('gpu_memory')}</span>
                    <span>
                      {devboxDetail?.usedGpuMemory?.yData[
                        devboxDetail?.usedGpuMemory?.yData?.length - 1
                      ]}{' '}
                      GB
                    </span>
                  </div>
                  <div className={chartWrapperClass}>
                    <MonitorChart
                      type="green"
                      data={devboxDetail?.usedGpuMemory}
                      isShowText={false}
                      splitNumber={4}
                      className="w-full"
                      isShowLabel
                      maxValue={gpuMemoryMaxValue}
                      valueUnit=" GB"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default Monitor;
