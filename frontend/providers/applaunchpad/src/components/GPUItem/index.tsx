import React, { useMemo } from 'react';
import MyIcon from '../Icon';
import { GpuType } from '@/types/app';
import { useTranslation } from 'next-i18next';
import { useUserStore } from '@/store/user';

const GPUItem = ({ gpu }: { gpu?: GpuType }) => {
  const { t } = useTranslation();
  const { userSourcePrice } = useUserStore();

  const gpuAlias = useMemo(() => {
    const gpuItem = userSourcePrice?.gpu?.find((item) => item.type === gpu?.type);

    return gpuItem?.alias || gpu?.type || '';
  }, [gpu?.type, userSourcePrice?.gpu]);

  return (
    <div className="flex whitespace-nowrap">
      <MyIcon name={'nvidia'} w={'16px'} className="mr-2" />
      {gpuAlias && (
        <>
          <span>{gpuAlias}</span>
          <span className="mx-1 text-zinc-500">/</span>
        </>
      )}
      <span className={gpu?.amount ? 'text-zinc-600' : 'text-zinc-500'}>
        {gpuAlias ? gpu?.amount : 0}
        {t('Card')}
      </span>
    </div>
  );
};

export default React.memo(GPUItem);
