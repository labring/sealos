import Image from 'next/image';
import { useMemo } from 'react';
import type { SyntheticEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';

import { cn } from '@sealos/shadcn-ui';
import { Label } from '@sealos/shadcn-ui/label';
import { usePriceStore } from '@/stores/price';
import { DevboxEditTypeV2 } from '@/types/devbox';
import { GpuAmountMarkList } from '@/constants/devbox';
import type { SourcePrice } from '@/types/static';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@sealos/shadcn-ui/select';

export default function Gpu({
  countGpuInventory
}: {
  countGpuInventory: (type: string) => number;
}) {
  type GpuPriceItem = NonNullable<SourcePrice['gpu']>[number];
  const defaultGpuIcon = '/images/nvidia.svg';

  const t = useTranslations();
  const locale = useLocale();
  const { sourcePrice } = usePriceStore();
  const { watch, setValue } = useFormContext<DevboxEditTypeV2>();

  const selectedGpuType = watch('gpu.type');
  const selectedGpuAmount = watch('gpu.amount');

  const getGpuDisplayName = (gpu?: GpuPriceItem) => {
    if (!gpu) return '';
    const name = gpu.name;
    const localizedName = locale.includes('zh') ? name?.zh : name?.en;
    return localizedName || gpu.annotationType || '';
  };

  const selectedGpu = useMemo(() => {
    const selected = sourcePrice?.gpu?.find((item) => item.annotationType === selectedGpuType);
    if (!selected) return undefined;
    return selected;
  }, [sourcePrice?.gpu, selectedGpuType]);

  const handleGpuIconError = (event: SyntheticEvent<HTMLImageElement>) => {
    const target = event.currentTarget;
    if (!target.src.endsWith(defaultGpuIcon)) {
      target.src = defaultGpuIcon;
    }
  };

  if (!sourcePrice?.gpu) {
    return null;
  }

  return (
    <div className="flex items-start gap-10">
      <Label className="w-15 font-medium text-gray-900">{t('gpu')}</Label>
      <div className="flex flex-col gap-4">
        <Select
          value={selectedGpuType || 'none'}
          onValueChange={(value) => {
            const selected = sourcePrice?.gpu?.find((item) => item.annotationType === value);
            const available = value !== 'none' ? countGpuInventory(value) : 0;

            if (value === 'none') {
              setValue('gpu', undefined);
            } else if (selected && available > 0) {
              setValue('gpu.type', value);
              // NOTE: maybe this should be set.
              setValue('gpu.manufacturers', 'nvidia');
              setValue('gpu.resource', selected.resource);
              if (!selectedGpuAmount || selectedGpuAmount > available) {
                setValue('gpu.amount', 1);
              }
            }
          }}
        >
          <SelectTrigger className="h-10 w-[440px] border-zinc-200">
            <SelectValue placeholder={t('No GPU')}>
              {selectedGpu ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-md border border-transparent bg-zinc-100 px-2 py-1">
                    <Image
                      src={selectedGpu.icon ? `/images/${selectedGpu.icon}.svg` : defaultGpuIcon}
                      alt={selectedGpu.annotationType}
                      width={16}
                      height={16}
                      onError={handleGpuIconError}
                    />
                    <span className="text-sm font-medium text-zinc-900">
                      {getGpuDisplayName(selectedGpu)}
                    </span>
                  </div>
                  <span className="text-sm text-zinc-900">
                    {t('video_memory')}: {Math.round(selectedGpu.vm)}GB
                  </span>
                  <div className="h-[15px] w-px bg-zinc-200" />
                  <span className="text-sm text-zinc-900">
                    {t('Inventory')}:{' '}
                    <span className="text-yellow-600">
                      {countGpuInventory(selectedGpuType!)}/{selectedGpu.count}
                    </span>
                  </span>
                </div>
              ) : (
                t('No GPU')
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t('No GPU')}</SelectItem>
            {sourcePrice?.gpu.map((item) => {
              const available = countGpuInventory(item.annotationType);
              return (
                <SelectItem
                  key={item.annotationType}
                  value={item.annotationType}
                  disabled={available <= 0}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-md border border-transparent bg-zinc-100 px-2 py-1">
                      <Image
                        src={item.icon ? `/images/${item.icon}.svg` : defaultGpuIcon}
                        alt={item.annotationType}
                        width={16}
                        height={16}
                        onError={handleGpuIconError}
                      />
                      <span className="text-sm font-medium text-zinc-900">
                        {getGpuDisplayName(item)}
                      </span>
                    </div>
                    <span className="text-sm text-zinc-900">
                      {t('video_memory')}: {Math.round(item.vm)}GB
                    </span>
                    <div className="h-[15px] w-px bg-zinc-200" />
                    <span className="text-sm text-zinc-900">
                      {t('Inventory')}:{' '}
                      <span className="text-yellow-600">
                        {available}/{item.count}
                      </span>
                    </span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {selectedGpuType && selectedGpuType !== 'none' && (
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-gray-900">{t('count')}</Label>
            <div className="flex gap-2">
              {GpuAmountMarkList.map((item) => {
                const available = selectedGpuType ? countGpuInventory(selectedGpuType) : 0;
                const hasInventory = item.value <= available;
                const isSelected = selectedGpuAmount === item.value;

                return (
                  <button
                    key={item.value}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg border bg-white text-sm transition-all',
                      isSelected
                        ? 'border-zinc-900 text-zinc-900'
                        : 'border-zinc-200 text-zinc-900',
                      !hasInventory && 'cursor-not-allowed opacity-40'
                    )}
                    disabled={!hasInventory}
                    onClick={() => {
                      if (hasInventory) {
                        setValue('gpu.amount', item.value);
                      }
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
