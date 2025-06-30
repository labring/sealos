'use client';

import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';

import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

import { DevboxEditTypeV2 } from '@/types/devbox';
import { CpuSlideMarkList } from '@/constants/devbox';

export default function Cpu() {
  const t = useTranslations();

  const { watch, setValue } = useFormContext<DevboxEditTypeV2>();

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
