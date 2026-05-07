import Image from 'next/image';
import { useCallback, useEffect, useMemo } from 'react';
import type { SyntheticEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Minus, Plus } from 'lucide-react';
import { useFormContext } from 'react-hook-form';

import { cn } from '@sealos/shadcn-ui';
import { Label } from '@sealos/shadcn-ui/label';
import type { DevboxEditTypeV2 } from '@/types/devbox';
import type { GpuInventoryModel, GpuInventorySpec, GpuPodConfig } from '@/types/gpu';
import { gpuTypeAnnotationKey } from '@/constants/devbox';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@sealos/shadcn-ui/select';

const defaultGpuIcon = '/images/nvidia.svg';

const normalizeText = (value?: string) => value?.trim().replace(/\s+/g, '').toLowerCase() || '';

const getSpecKey = (spec: Pick<GpuInventorySpec, 'type' | 'value'>) => `${spec.type}@@${spec.value}`;

const getModelDisplayName = (
  model: Pick<GpuInventoryModel, 'model' | 'displayName'>,
  locale: string
) => {
  const localizedName = locale.includes('zh') ? model.displayName?.zh : model.displayName?.en;
  return localizedName || model.model;
};

const getSpecDisplayName = (spec: Pick<GpuInventorySpec, 'type' | 'memory'>, memoryLabel: string) =>
  `${spec.type} | ${memoryLabel}：${spec.memory}`;

const getSpecFromModel = (
  model: GpuInventoryModel,
  specType?: string,
  specValue?: string
): GpuInventorySpec | undefined => {
  if (!specType || !specValue) return undefined;
  return model.specs.find((spec) => spec.type === specType && spec.value === specValue);
};

const isSameRecord = (lhs?: Record<string, string>, rhs?: Record<string, string>) => {
  const left = lhs || {};
  const right = rhs || {};
  const leftEntries = Object.entries(left).sort(([a], [b]) => a.localeCompare(b));
  const rightEntries = Object.entries(right).sort(([a], [b]) => a.localeCompare(b));

  if (leftEntries.length !== rightEntries.length) return false;
  return leftEntries.every(
    ([key, value], index) => rightEntries[index]?.[0] === key && rightEntries[index]?.[1] === value
  );
};

const isSamePodConfig = (left?: GpuPodConfig, right?: GpuPodConfig) => {
  return (
    isSameRecord(left?.annotations, right?.annotations) &&
    isSameRecord(left?.resources?.limits, right?.resources?.limits)
  );
};

const clampAmount = (value: number | undefined, min: number, max: number) => {
  const safeValue = typeof value === 'number' && Number.isFinite(value) ? value : min;
  return Math.min(Math.max(safeValue, min), max);
};

export default function Gpu({ gpuInventory }: { gpuInventory: GpuInventoryModel[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const { watch, setValue } = useFormContext<DevboxEditTypeV2>();

  const selectedModel = watch('gpu.model');
  const selectedType = watch('gpu.type');
  const selectedSpecType = watch('gpu.specType');
  const selectedSpecValue = watch('gpu.specValue');
  const selectedSpecMemory = watch('gpu.specMemory');
  const selectedSpecStock = watch('gpu.stock');
  const selectedPodConfig = watch('gpu.podConfig');
  const selectedAmount = watch('gpu.amount');
  const selectedResource = watch('gpu.resource');

  const selectedModelItem = useMemo(
    () => gpuInventory.find((item) => item.model === selectedModel),
    [gpuInventory, selectedModel]
  );

  const selectedSpecItem = useMemo(() => {
    if (!selectedModelItem) return undefined;

    const bySpecValue = getSpecFromModel(selectedModelItem, selectedSpecType, selectedSpecValue);
    if (bySpecValue) return bySpecValue;

    if (selectedPodConfig) {
      return selectedModelItem.specs.find((spec) => isSamePodConfig(spec.podConfig, selectedPodConfig));
    }

    return undefined;
  }, [selectedModelItem, selectedSpecType, selectedSpecValue, selectedPodConfig]);

  const selectedModelDisplayName = selectedModelItem
    ? getModelDisplayName(selectedModelItem, locale)
    : undefined;

  const selectedSpecDisplayName = selectedSpecItem
    ? getSpecDisplayName(selectedSpecItem, t('video_memory'))
    : selectedSpecType && selectedSpecMemory
      ? `${selectedSpecType} | ${t('video_memory')}：${selectedSpecMemory}`
      : undefined;

  const upsertGpuValue = useCallback(
    ({
      model,
      spec,
      keepAmount = false,
      shouldDirty = true
    }: {
      model: GpuInventoryModel;
      spec: GpuInventorySpec;
      keepAmount?: boolean;
      shouldDirty?: boolean;
    }) => {
      const amountMax = Math.max(spec.stock || 0, 1);
      const amount = spec.type === 'GPU' ? clampAmount(keepAmount ? selectedAmount : 1, 1, amountMax) : 1;
      const annotationType =
        spec.podConfig?.annotations?.[gpuTypeAnnotationKey] || selectedType || selectedModel || model.model;

      setValue(
        'gpu',
        {
          manufacturers: 'nvidia',
          model: model.model,
          type: annotationType,
          amount,
          specType: spec.type,
          specValue: spec.value,
          specMemory: spec.memory,
          stock: spec.stock,
          podConfig: spec.podConfig,
          resource: selectedResource
        },
        {
          shouldDirty,
          shouldTouch: shouldDirty,
          shouldValidate: true
        }
      );
    },
    [selectedAmount, selectedModel, selectedResource, selectedType, setValue]
  );

  useEffect(() => {
    if (!gpuInventory.length) {
      return;
    }

    const selectedGpuModel =
      (selectedModel && gpuInventory.find((item) => item.model === selectedModel)) ||
      gpuInventory.find((item) =>
        item.specs.some(
          (spec) =>
            normalizeText(spec.podConfig?.annotations?.[gpuTypeAnnotationKey]) === normalizeText(selectedType)
        )
      );

    if (!selectedGpuModel) return;

    const matchedSpec =
      getSpecFromModel(selectedGpuModel, selectedSpecType, selectedSpecValue) ||
      (selectedPodConfig
        ? selectedGpuModel.specs.find((spec) => isSamePodConfig(spec.podConfig, selectedPodConfig))
        : undefined);

    if (!matchedSpec) return;

    const shouldSync =
      selectedModel !== selectedGpuModel.model ||
      selectedSpecType !== matchedSpec.type ||
      selectedSpecValue !== matchedSpec.value ||
      selectedSpecMemory !== matchedSpec.memory ||
      selectedSpecStock !== matchedSpec.stock ||
      !isSamePodConfig(selectedPodConfig, matchedSpec.podConfig);

    if (!shouldSync) return;

    upsertGpuValue({
      model: selectedGpuModel,
      spec: matchedSpec,
      keepAmount: true,
      shouldDirty: false
    });
  }, [
    gpuInventory,
    selectedModel,
    selectedType,
    selectedSpecType,
    selectedSpecValue,
    selectedSpecMemory,
    selectedSpecStock,
    selectedPodConfig,
    upsertGpuValue
  ]);

  useEffect(() => {
    if (!selectedSpecItem || selectedSpecItem.type !== 'GPU') {
      if (selectedAmount !== 1 && selectedAmount !== undefined) {
        setValue('gpu.amount', 1, {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: false
        });
      }
      return;
    }

    const clamped = clampAmount(selectedAmount, 1, Math.max(selectedSpecItem.stock, 1));
    if (clamped !== selectedAmount) {
      setValue('gpu.amount', clamped, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false
      });
    }
  }, [selectedAmount, selectedSpecItem, setValue]);

  const handleGpuIconError = (event: SyntheticEvent<HTMLImageElement>) => {
    const target = event.currentTarget;
    if (!target.src.endsWith(defaultGpuIcon)) {
      target.src = defaultGpuIcon;
    }
  };

  const showGpuAmountControl = selectedSpecItem?.type === 'GPU';

  if (gpuInventory.length === 0) {
    return null;
  }

  return (
    <div className="flex items-start gap-4">
      <Label className="w-[82px] pt-2 text-base font-medium text-gray-900">{t('gpu')}</Label>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-gray-900">{t('model')}</Label>
          <Select
            value={selectedModel || 'none'}
            onValueChange={(value) => {
              if (value === 'none') {
                setValue('gpu', undefined, {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true
                });
                return;
              }

              const model = gpuInventory.find((item) => item.model === value);
              if (!model) return;

              const firstAvailableSpec = model.specs.find((spec) => spec.stock > 0) || model.specs[0];
              if (!firstAvailableSpec) return;

              upsertGpuValue({
                model,
                spec: firstAvailableSpec,
                keepAmount: false,
                shouldDirty: true
              });
            }}
          >
            <SelectTrigger className="h-10 w-[478px] border-zinc-200">
              <SelectValue placeholder={t('No GPU')}>
                {selectedModelItem ? (
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex shrink-0 items-center gap-1.5 rounded-md bg-zinc-100 px-2 py-1">
                      <Image
                        src={selectedModelItem.icon ? `/images/${selectedModelItem.icon}.svg` : defaultGpuIcon}
                        alt={selectedModelItem.model}
                        width={16}
                        height={16}
                        onError={handleGpuIconError}
                      />
                      <span className="text-sm font-medium text-zinc-900">{selectedModelDisplayName}</span>
                    </div>
                  </div>
                ) : (
                  t('No GPU')
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('No GPU')}</SelectItem>
              {gpuInventory.map((item) => (
                <SelectItem key={item.model} value={item.model}>
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex shrink-0 items-center gap-1.5 rounded-md bg-zinc-100 px-2 py-1">
                      <Image
                        src={item.icon ? `/images/${item.icon}.svg` : defaultGpuIcon}
                        alt={item.model}
                        width={16}
                        height={16}
                        onError={handleGpuIconError}
                      />
                      <span className="text-sm font-medium text-zinc-900">
                        {getModelDisplayName(item, locale)}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedModelItem && (
          <div className="flex items-end justify-between gap-6">
            <div className={cn('flex flex-col gap-2', showGpuAmountControl ? 'w-[295px]' : 'w-[478px]')}>
              <Label className="text-sm font-medium text-gray-900">{t('specification')}</Label>
              <Select
                value={selectedSpecItem ? getSpecKey(selectedSpecItem) : 'none'}
                onValueChange={(value) => {
                  if (value === 'none') return;

                  const spec = selectedModelItem.specs.find((item) => getSpecKey(item) === value);
                  if (!spec) return;

                  upsertGpuValue({
                    model: selectedModelItem,
                    spec,
                    keepAmount: true,
                    shouldDirty: true
                  });
                }}
              >
                <SelectTrigger className="h-10 w-full border-zinc-200">
                  <SelectValue placeholder={t('specification')}>
                    <span className="text-sm text-zinc-900">{selectedSpecDisplayName || t('specification')}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {selectedModelItem.specs.map((item) => (
                    <SelectItem key={getSpecKey(item)} value={getSpecKey(item)} disabled={item.stock <= 0}>
                      <div className="flex items-center gap-2 text-sm text-zinc-900">
                        <span>{getSpecDisplayName(item, t('video_memory'))}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showGpuAmountControl && (
              <div className="flex w-[158px] flex-col gap-2">
                <Label className="text-sm font-medium text-gray-900">{t('count')}</Label>
                <div className="flex h-10 items-center">
                  <button
                    className="flex h-10 w-10 items-center justify-center rounded-l-md border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={(selectedAmount || 1) <= 1}
                    onClick={() => setValue('gpu.amount', Math.max((selectedAmount || 1) - 1, 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="flex h-10 w-20 items-center justify-center border-y border-zinc-200 bg-white text-sm font-medium text-zinc-900">
                    {selectedAmount || 1}
                  </div>
                  <button
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-r-md border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40'
                    )}
                    disabled={(selectedAmount || 1) >= Math.max(selectedSpecItem.stock, 1)}
                    onClick={() =>
                      setValue(
                        'gpu.amount',
                        Math.min((selectedAmount || 1) + 1, Math.max(selectedSpecItem.stock, 1))
                      )
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
