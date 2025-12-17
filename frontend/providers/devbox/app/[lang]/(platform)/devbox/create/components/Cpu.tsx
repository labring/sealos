'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';

import { Label } from '@sealos/shadcn-ui/label';
import { Slider } from '@sealos/shadcn-ui/slider';

import { DevboxEditTypeV2 } from '@/types/devbox';
import { useEnvStore } from '@/stores/env';

export default function Cpu() {
  const t = useTranslations();
  const { env } = useEnvStore();
  const { watch, setValue } = useFormContext<DevboxEditTypeV2>();

  const CpuSlideMarkList = useMemo(() => {
    if (!env.cpuSlideMarkList) {
      return [
        { label: 1, value: 1000 },
        { label: 2, value: 2000 },
        { label: 4, value: 4000 },
        { label: 8, value: 8000 },
        { label: 16, value: 16000 }
      ];
    }

    try {
      const cpuList = env.cpuSlideMarkList.split(',').map((v) => Number(v.trim()));
      return cpuList.map((cpu) => ({ label: cpu, value: cpu * 1000 }));
    } catch (error) {
      console.error('Failed to parse CPU list from env:', error);
      return [
        { label: 1, value: 1000 },
        { label: 2, value: 2000 },
        { label: 4, value: 4000 },
        { label: 8, value: 8000 },
        { label: 16, value: 16000 }
      ];
    }
  }, [env.cpuSlideMarkList]);

  const currentValue = watch('cpu');
  const currentIndex = CpuSlideMarkList.findIndex((item) => item.value === currentValue);

  return (
    <div className="flex items-start gap-10">
      <Label className="w-15 font-medium text-gray-900">{t('cpu')}</Label>
      <div className="flex-1">
        <Slider
          value={[currentIndex !== -1 ? currentIndex : 0]}
          onValueChange={(values) => {
            const index = values[0];
            setValue('cpu', CpuSlideMarkList[index].value);
          }}
          max={CpuSlideMarkList.length - 1}
          min={0}
          step={1}
          marks={CpuSlideMarkList}
        />
      </div>
    </div>
  );
}
