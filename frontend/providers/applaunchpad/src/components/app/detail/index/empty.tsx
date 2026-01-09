import React from 'react';
import MyIcon from '@/components/Icon';
import { useTranslation } from 'next-i18next';

const Empty = () => {
  const { t } = useTranslation();
  return (
    <div className="w-full h-full bg-white select-none flex flex-col items-center justify-center">
      <MyIcon name={'noEvents'} color={'transparent'} width={'80px'} height={'80px'} />
      <div className="py-8 text-zinc-500">{t('no_logs_for_now')}</div>
    </div>
  );
};

export default Empty;
