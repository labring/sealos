'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';

import { DevboxEditTypeV2 } from '@/types/devbox';
import { useEnvStore } from '@/stores/env';

import { Label } from '@sealos/shadcn-ui/label';
import { Slider } from '@sealos/shadcn-ui/slider';

export default function Storage() {
  const t = useTranslations();
  const { env } = useEnvStore();
  const { watch, setValue } = useFormContext<DevboxEditTypeV2>();

  const StorageSlideMarkList = useMemo(() => {
    if (!env.storageSlideMarkList) {
      return [
        { label: '10', value: 10 },
        { label: '20', value: 20 },
        { label: '30', value: 30 },
        { label: '40', value: 40 },
        { label: '50', value: 50 }
      ];
    }

    try {
      const storageList = env.storageSlideMarkList.split(',').map((v) => Number(v.trim()));
      return storageList.map((storage) => ({ label: String(storage), value: storage }));
    } catch (error) {
      console.error('Failed to parse storage list from env:', error);
      return [
        { label: '10', value: 10 },
        { label: '20', value: 20 },
        { label: '30', value: 30 },
        { label: '40', value: 40 },
        { label: '50', value: 50 }
      ];
    }
  }, [env.storageSlideMarkList]);

  const currentValue = watch('storage');
  const currentIndex = StorageSlideMarkList.findIndex((item) => item.value === currentValue);

  return (
    <div className="flex items-start gap-10">
      <Label className="w-15 font-medium text-gray-900">{t('storage')}</Label>
      <div className="flex flex-1">
        <Slider
          value={[currentIndex !== -1 ? currentIndex : 0]}
          onValueChange={(values) => {
            const index = values[0];
            setValue('storage', StorageSlideMarkList[index].value);
          }}
          max={StorageSlideMarkList.length - 1}
          min={0}
          step={1}
          marks={StorageSlideMarkList}
        />
        <span className="mt-[18px] ml-2 h-auto text-sm text-neutral-500">Gi</span>
      </div>
    </div>
  );
}
