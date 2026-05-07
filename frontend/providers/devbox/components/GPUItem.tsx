import React, { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';

import { cn } from '@sealos/shadcn-ui';
import { GpuType } from '@/types/user';
import { usePriceStore } from '@/stores/price';
import { Tooltip, TooltipContent, TooltipTrigger } from '@sealos/shadcn-ui/tooltip';

const normalizeText = (value?: string) => value?.trim().replace(/\s+/g, '').toLowerCase() || '';

const GPUItem = ({ gpu, className }: { gpu?: GpuType; className?: string }) => {
  const t = useTranslations();
  const locale = useLocale();
  const { sourcePrice } = usePriceStore();
  const defaultGpuIcon = '/images/nvidia.svg';

  const gpuItem = useMemo(() => {
    const gpuList = sourcePrice?.gpu;
    if (!gpuList?.length || !gpu?.type) return undefined;

    const normalizedType = normalizeText(gpu.type);
    const normalizedSpecType = normalizeText(gpu.specType);
    const normalizedSpecValue = normalizeText(gpu.specValue);

    const matchedBySpec = gpuList.find(
      (item) =>
        normalizeText(item.annotationType) === normalizedType &&
        (!normalizedSpecType || normalizeText(item.specType) === normalizedSpecType) &&
        (!normalizedSpecValue || normalizeText(item.specValue) === normalizedSpecValue)
    );

    if (matchedBySpec) return matchedBySpec;

    return gpuList.find((item) => normalizeText(item.annotationType) === normalizedType);
  }, [gpu?.specType, gpu?.specValue, gpu?.type, sourcePrice?.gpu]);

  const gpuLabel = useMemo(() => {
    const name = gpuItem?.name;
    const localizedName = locale.includes('zh') ? name?.zh : name?.en;
    return localizedName || gpuItem?.annotationType || gpu?.type || '';
  }, [gpu?.type, gpuItem?.annotationType, gpuItem?.name, locale]);

  const gpuSpecType = gpu?.specType || gpuItem?.specType || '';
  const gpuSpecMemory = gpu?.specMemory || gpuItem?.specMemory || '';
  const isVgpu = gpuSpecType.toLowerCase() === 'vgpu';

  const gpuDisplayLabel = useMemo(() => {
    if (!gpuLabel) return `0${t('Card')}`;

    if (isVgpu) {
      return [gpuLabel, gpuSpecType || 'vGPU', gpuSpecMemory].filter(Boolean).join(' ');
    }

    return `${gpuLabel} / ${gpu?.amount || 0}${t('Card')}`;
  }, [gpu?.amount, gpuLabel, gpuSpecMemory, gpuSpecType, isVgpu, t]);

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
      <span className="truncate">{gpuDisplayLabel}</span>
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
          {gpuDisplayLabel}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

export default GPUItem;
