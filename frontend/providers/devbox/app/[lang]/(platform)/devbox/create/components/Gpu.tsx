import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';

import { cn } from '@sealos/shadcn-ui';
import { Label } from '@sealos/shadcn-ui/label';
import { usePriceStore } from '@/stores/price';
import { DevboxEditTypeV2 } from '@/types/devbox';
import { GpuAmountMarkList } from '@/constants/devbox';

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
  const t = useTranslations();
  const { sourcePrice } = usePriceStore();
  const { watch, setValue } = useFormContext<DevboxEditTypeV2>();

  const selectedGpuType = watch('gpu.type');
  const selectedGpuAmount = watch('gpu.amount');

  const selectedGpu = useMemo(() => {
    const selected = sourcePrice?.gpu?.find((item) => item.type === selectedGpuType);
    if (!selected) return undefined;
    return {
      ...selected,
      inventory: countGpuInventory(selected.type)
    };
  }, [sourcePrice?.gpu, selectedGpuType, countGpuInventory]);

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
            const selected = sourcePrice?.gpu?.find((item) => item.type === value);
            const inventory = value !== 'none' ? countGpuInventory(value) : 0;

            if (value === 'none') {
              setValue('gpu', undefined);
            } else if (selected && inventory > 0) {
              setValue('gpu.type', value);
              setValue('gpu.manufacturers', 'nvidia');
              if (!selectedGpuAmount || selectedGpuAmount > inventory) {
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
                    <img src="/images/nvidia.svg" alt="NVIDIA" className="h-4 w-4" />
                    <span className="text-sm font-medium text-zinc-900">{selectedGpu.alias}</span>
                  </div>
                  <span className="text-sm text-zinc-900">
                    Video memory: {Math.round(selectedGpu.vm)}GB
                  </span>
                  <div className="h-[15px] w-px bg-zinc-200" />
                  <span className="text-sm text-zinc-900">
                    {t('Inventory')}:{' '}
                    <span className="text-yellow-600">{selectedGpu.inventory}</span>
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
              const inventory = countGpuInventory(item.type);
              return (
                <SelectItem key={item.type} value={item.type} disabled={inventory <= 0}>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-md border border-transparent bg-zinc-100 px-2 py-1">
                      <img src="/images/nvidia.svg" alt="NVIDIA" className="h-4 w-4" />
                      <span className="text-sm font-medium text-zinc-900">{item.alias}</span>
                    </div>
                    <span className="text-sm text-zinc-900">
                      Video memory: {Math.round(item.vm)}GB
                    </span>
                    <div className="h-[15px] w-px bg-zinc-200" />
                    <span className="text-sm text-zinc-900">
                      {t('Inventory')}:{' '}
                      <span className="text-yellow-600">{inventory}</span>
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
                const inventory = selectedGpu?.inventory || 0;
                const hasInventory = item.value <= inventory;
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
