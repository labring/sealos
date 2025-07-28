import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { CircuitBoard } from 'lucide-react';

import { cn } from '@/lib/utils';
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
      <CircuitBoard className="mr-2 w-4 text-muted-foreground" />
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
