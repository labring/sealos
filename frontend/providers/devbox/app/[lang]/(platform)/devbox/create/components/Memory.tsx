'use client';

import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';

import { DevboxEditTypeV2 } from '@/types/devbox';
import { MemorySlideMarkList } from '@/constants/devbox';

import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

export default function Memory() {
  const t = useTranslations();
  const { watch, setValue } = useFormContext<DevboxEditTypeV2>();

  const currentValue = watch('memory');
  const currentIndex = MemorySlideMarkList.findIndex((item) => item.value === currentValue);

  return (
    <div className="flex items-start gap-10">
      <Label className="w-15 font-medium text-gray-900">{t('memory')}</Label>
      <div className="flex-1">
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
      </div>
    </div>
  );
}
