'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';

import { DevboxEditTypeV2 } from '@/types/devbox';
import { useEnvStore } from '@/stores/env';

import { Label } from '@sealos/shadcn-ui/label';
import { Slider } from '@sealos/shadcn-ui/slider';

export default function Memory() {
  const t = useTranslations();
  const { env } = useEnvStore();
  const { watch, setValue } = useFormContext<DevboxEditTypeV2>();

  const MemorySlideMarkList = useMemo(() => {
    if (!env.memorySlideMarkList) {
      return [
        { label: '2', value: 2048 },
        { label: '4', value: 4096 },
        { label: '8', value: 8192 },
        { label: '16', value: 16384 },
        { label: '32', value: 32768 }
      ];
    }

    try {
      const memoryList = env.memorySlideMarkList.split(',').map((v) => Number(v.trim()));
      return memoryList.map((memory) => ({ label: String(memory), value: memory * 1024 }));
    } catch (error) {
      console.error('Failed to parse memory list from env:', error);
      return [
        { label: '2', value: 2048 },
        { label: '4', value: 4096 },
        { label: '8', value: 8192 },
        { label: '16', value: 16384 },
        { label: '32', value: 32768 }
      ];
    }
  }, [env.memorySlideMarkList]);

  const currentValue = watch('memory');
  const currentIndex = MemorySlideMarkList.findIndex((item) => item.value === currentValue);

  return (
    <div className="flex items-start gap-10">
      <Label className="w-15 font-medium text-gray-900">{t('memory')}</Label>
      <div className="flex flex-1">
        <Slider
          value={[currentIndex !== -1 ? currentIndex : 0]}
          onValueChange={(values) => {
            const index = values[0];
            setValue('memory', MemorySlideMarkList[index].value);
          }}
          max={MemorySlideMarkList.length - 1}
          min={0}
          step={1}
          marks={MemorySlideMarkList}
        />
        <span className="mt-[18px] ml-2 h-auto text-sm text-neutral-500">Gi</span>
      </div>
    </div>
  );
}
