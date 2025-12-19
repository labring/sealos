import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

import { cn } from '@sealos/shadcn-ui';
import { GpuType } from '@/types/user';
import { usePriceStore } from '@/stores/price';

const GPUItem = ({ gpu, className }: { gpu?: GpuType; className?: string }) => {
  const t = useTranslations();
  const { sourcePrice } = usePriceStore();

  const gpuAlias = useMemo(() => {
    const gpuItem = sourcePrice?.gpu?.find((item) => item.type === gpu?.type);
    return gpuItem?.alias || gpu?.type || '';
  }, [gpu?.type, sourcePrice?.gpu]);

  return (
    <div className={cn('flex items-center whitespace-nowrap', className)}>
      <Image src="/images/nvidia.svg" alt="GPU" width={16} height={16} className="mr-2" />
      {gpuAlias && (
        <>
          <div className="text-xs">{gpuAlias}</div>
          <div className="mx-1 text-muted-foreground">/</div>
        </>
      )}
      <div className={cn('text-xs', !!gpu?.amount ? 'text-foreground' : 'text-muted-foreground')}>
        {!!gpuAlias ? gpu?.amount : 0}
        {t('Card')}
      </div>
    </div>
  );
};

export default GPUItem;
