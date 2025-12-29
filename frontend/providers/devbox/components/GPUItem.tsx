import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

import { cn } from '@sealos/shadcn-ui';
import { GpuType } from '@/types/user';
import { usePriceStore } from '@/stores/price';
import { Tooltip, TooltipContent, TooltipTrigger } from '@sealos/shadcn-ui/tooltip';

const GPUItem = ({ gpu, className }: { gpu?: GpuType; className?: string }) => {
  const t = useTranslations();
  const { sourcePrice } = usePriceStore();

  const gpuAlias = useMemo(() => {
    const gpuItem = sourcePrice?.gpu?.find((item) => item.type === gpu?.type);
    return gpuItem?.alias || gpu?.type || '';
  }, [gpu?.type, sourcePrice?.gpu]);

  const content = (
    <div className={cn('flex max-w-full items-center text-sm text-zinc-600', className)}>
      <Image src="/images/nvidia.svg" alt="GPU" width={16} height={16} className="mr-2 shrink-0" />
      {gpuAlias && (
        <>
          <span className="truncate">{gpuAlias}</span>
          <span className="mx-1 shrink-0">/</span>
        </>
      )}
      <span className="shrink-0">
        {!!gpuAlias ? gpu?.amount : 0} {t('Card')}
      </span>
    </div>
  );

  if (!gpuAlias) return content;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="top">
        <div className="flex items-center gap-2">
          <Image src="/images/nvidia.svg" alt="GPU" width={16} height={16} />
          {gpuAlias} / {gpu?.amount}
          {t('Card')}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

export default GPUItem;
