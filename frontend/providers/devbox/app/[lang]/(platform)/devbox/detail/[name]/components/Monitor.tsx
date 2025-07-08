import { useTranslation } from 'react-i18next';

import DatePicker from '@/components/DatePicker';

const Monitor = () => {
  const { t } = useTranslation();

  return (
    <div className="flex h-50 flex-col items-start gap-2">
      <div className="flex w-full items-center justify-between rounded-xl border-[0.5px] bg-white p-6 shadow-xs">
        <div className="flex items-center gap-4">
          <span className="text-lg/7 font-medium">{t('filter')}</span>
          <DatePicker />
        </div>
      </div>
      <div className="flex w-full items-center justify-between rounded-xl border-[0.5px] bg-white p-6 shadow-xs">
        <span className="text-lg/7 font-medium">Live Monitoring</span>
      </div>
      <div className="flex w-full items-center justify-between rounded-xl border-[0.5px] bg-white p-6 shadow-xs">
        <span className="text-lg/7 font-medium">Live Monitoring</span>
      </div>
    </div>
  );
};

export default Monitor;
