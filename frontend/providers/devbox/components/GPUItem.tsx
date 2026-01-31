import React, { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';

import { cn } from '@sealos/shadcn-ui';
import { GpuType } from '@/types/user';
import { usePriceStore } from '@/stores/price';
import { Tooltip, TooltipContent, TooltipTrigger } from '@sealos/shadcn-ui/tooltip';

const GPUItem = ({ gpu, className }: { gpu?: GpuType; className?: string }) => {
  const t = useTranslations();
  const locale = useLocale();
  const { sourcePrice } = usePriceStore();
  const defaultGpuIcon = '/images/nvidia.svg';

  const gpuItem = useMemo(
    () => sourcePrice?.gpu?.find((item) => item.annotationType === gpu?.type),
    [gpu?.type, sourcePrice?.gpu]
  );

  const gpuLabel = useMemo(() => {
    const name = gpuItem?.name;
    const localizedName = locale.includes('zh') ? name?.zh : name?.en;
    return localizedName || gpuItem?.annotationType || gpu?.type || '';
  }, [gpu?.type, gpuItem?.annotationType, gpuItem?.name, locale]);

  const handleGpuIconError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const target = event.currentTarget;
    if (!target.src.endsWith(defaultGpuIcon)) {
      target.src = defaultGpuIcon;
    }
  };

  const content = (
    <div className={cn('flex max-w-full items-center text-sm text-zinc-600', className)}>
      <Image
        src={gpuItem?.icon ? `/images/${gpuItem?.icon}.svg` : defaultGpuIcon}
        alt={gpuItem?.annotationType || 'GPU'}
        width={16}
        height={16}
        className="mr-2 shrink-0"
        onError={handleGpuIconError}
      />
      {gpuItem?.name && (
        <>
          <span className="truncate">{gpuLabel}</span>
          <span className="mx-1 shrink-0">/</span>
        </>
      )}
      <span className="shrink-0">
        {!!gpuLabel ? gpu?.amount : 0}
        {t('Card')}
      </span>
    </div>
  );

  if (!gpuLabel) return content;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="top">
        <div className="flex items-center gap-2">
          <Image
            src={gpuItem?.icon ? `/images/${gpuItem?.icon}.svg` : defaultGpuIcon}
            alt={gpuItem?.annotationType || 'GPU'}
            width={16}
            height={16}
            onError={handleGpuIconError}
          />
          {gpuLabel} / {gpu?.amount}
          {t('Card')}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

export default GPUItem;
