import { useMemo } from 'react';
import { CurrencySymbol } from '@sealos/ui';
import { useTranslations } from 'next-intl';
import { CircuitBoard, Cpu, HardDrive, HdmiPort, MemoryStick } from 'lucide-react';

import { cn } from '@sealos/shadcn-ui';
import { gpuTypeAnnotationKey } from '@/constants/devbox';
import { useEnvStore } from '@/stores/env';
import { usePriceStore } from '@/stores/price';
import type { DevboxEditTypeV2 } from '@/types/devbox';

import { Card, CardContent, CardHeader } from '@sealos/shadcn-ui/card';

export const colorMap = {
  cpu: '#33BABB',
  memory: '#36ADEF',
  storage: '#6BCB77',
  nodeports: '#8172D8'
};

interface PriceBoxProps {
  components: {
    cpu: number;
    memory: number;
    pvcStorage?: number;
    gpu?: DevboxEditTypeV2['gpu'];
  }[];
  className?: string;
}

const normalizeText = (value?: string) => value?.trim().replace(/\s+/g, '').toLowerCase() || '';

const parseGpuFractionFromValue = (value?: string) => {
  if (!value) return 1;
  if (value === 'full') return 1;
  const matched = value.match(/^(\d+)\/(\d+)$/);
  if (!matched) return 1;

  const numerator = Number(matched[1]);
  const denominator = Number(matched[2]);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return 1;
  return numerator / denominator;
};

const getGpuSliceMultiplier = (gpu?: DevboxEditTypeV2['gpu']) => {
  if (!gpu) return 1;

  const limits = gpu.podConfig?.resources?.limits || {};
  const memoryPercentage = Number(limits['nvidia.com/gpumem-percentage'] || 0);
  if (Number.isFinite(memoryPercentage) && memoryPercentage > 0) {
    return memoryPercentage / 100;
  }

  const coresPercentage = Number(limits['nvidia.com/gpucores'] || 0);
  if (Number.isFinite(coresPercentage) && coresPercentage > 0) {
    return coresPercentage / 100;
  }

  return parseGpuFractionFromValue(gpu.specValue);
};

const getGpuCardCount = (gpu?: DevboxEditTypeV2['gpu']) => {
  if (!gpu) return 0;
  if (gpu.specType !== 'GPU') return 1;
  return Math.max(gpu.amount || 1, 1);
};

const getGpuPriceMatchKeys = (gpu?: DevboxEditTypeV2['gpu']) => {
  if (!gpu) return [];
  const annotationType = gpu.podConfig?.annotations?.[gpuTypeAnnotationKey];
  return [gpu.type, gpu.model, annotationType]
    .map((item) => normalizeText(item))
    .filter((item, index, arr) => item && arr.indexOf(item) === index);
};

const PriceBox = ({ components = [], className }: PriceBoxProps) => {
  const t = useTranslations();
  const { sourcePrice } = usePriceStore();
  const { env } = useEnvStore();

  const priceList: {
    icon?: React.ReactNode;
    label: string;
    value: string;
  }[] = useMemo(() => {
    let cp = 0;
    let mp = 0;
    let sp = 0;
    let pp = 0;
    let tp = 0;
    let gp = 0;

    components.forEach(({ cpu, memory, pvcStorage, gpu }) => {
      cp = (sourcePrice.cpu * cpu * 24) / 1000;
      mp = (sourcePrice.memory * memory * 24) / 1024;
      sp = sourcePrice.storage * (pvcStorage || 0) * 24;
      pp = sourcePrice.nodeports * 1 * 24;

      gp = (() => {
        if (!gpu) return 0;
        const keys = getGpuPriceMatchKeys(gpu);
        const item = sourcePrice?.gpu?.find((priceItem) => {
          const priceKeys = [
            priceItem.annotationType,
            priceItem.model,
            priceItem.name?.zh,
            priceItem.name?.en
          ]
            .map((entry) => normalizeText(entry))
            .filter(Boolean);
          return keys.some((key) => priceKeys.includes(key));
        });
        if (!item) return 0;

        const cardCount = getGpuCardCount(gpu);
        const sliceMultiplier = getGpuSliceMultiplier(gpu);
        return +(item.price * cardCount * sliceMultiplier * 24);
      })();

      tp = cp + mp + sp + pp + gp;
    });
    const iconClassName = 'h-5 w-5 text-neutral-400';

    return [
      {
        icon: <Cpu className={iconClassName} />,
        label: 'cpu',
        value: cp.toFixed(2)
      },
      {
        icon: <MemoryStick className={iconClassName} />,
        label: 'memory',
        color: '#36ADEF',
        value: mp.toFixed(2)
      },
      {
        icon: <HardDrive className={iconClassName} />,
        label: 'storage',
        value: sp.toFixed(2)
      },
      {
        icon: <HdmiPort className={iconClassName} />,
        label: 'nodeports',
        value: pp.toFixed(2)
      },
      ...(sourcePrice?.gpu
        ? [
            {
              icon: <CircuitBoard className={iconClassName} />,
              label: 'GPU',
              value: gp.toFixed(2)
            }
          ]
        : []),
      { label: 'total_price', value: tp.toFixed(2) }
    ];
  }, [
    components,
    sourcePrice.cpu,
    sourcePrice.memory,
    sourcePrice.storage,
    sourcePrice.nodeports,
    sourcePrice.gpu
  ]);

  return (
    <Card className={cn('guide-cost', className)}>
      <CardHeader className="flex h-13 items-center gap-2 border-b-1 border-zinc-100">
        <span className="font-medium">{t('estimated_price')}</span>
        <span className="font-medium text-zinc-400">{t('daily')}</span>
      </CardHeader>
      <CardContent className="flex flex-col">
        {priceList.map((item, index) => (
          <div
            key={item?.label}
            className={cn(
              'flex h-12 items-center justify-between px-5 py-6',
              index !== priceList.length - 1 && 'border-b-1 border-zinc-100'
            )}
          >
            <div className="flex h-full items-center gap-2 text-zinc-900">
              {item.icon}
              <span>{t(item?.label)}</span>
            </div>
            <div
              className={cn(
                'flex items-center font-medium text-zinc-600',
                index === priceList.length - 1 && 'text-blue-600'
              )}
            >
              <CurrencySymbol type={env.currencySymbol} />
              &nbsp;
              {item.value}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default PriceBox;
