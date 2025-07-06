import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';

import { cn } from '@/lib/utils';
import { usePriceStore } from '@/stores/price';
import { DevboxEditTypeV2 } from '@/types/devbox';
import { GpuAmountMarkList } from '@/constants/devbox';
import { listOfficialTemplateRepository } from '@/api/template';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// NOTE: this component style is not tested yet,because we do not use it normally
export default function Gpu({
  countGpuInventory
}: {
  countGpuInventory: (type: string) => number;
}) {
  const t = useTranslations();
  const { sourcePrice } = usePriceStore();
  const { control, watch, setValue, getValues } = useFormContext<DevboxEditTypeV2>();
  const templateRepositoryQuery = useQuery(
    ['list-official-template-repository'],
    listOfficialTemplateRepository
  );

  const templateData = useMemo(
    () => templateRepositoryQuery.data?.templateRepositoryList || [],
    [templateRepositoryQuery.data]
  );
  const templateRepositoryUid = getValues('templateRepositoryUid');
  const isGpuTemplate = useMemo(() => {
    const template = templateData.find((item) => item.uid === templateRepositoryUid);
    return template?.templateRepositoryTags.some((item) => item.tag.name === 'gpu');
  }, [templateData, templateRepositoryUid]);

  const selectedGpu = () => {
    const selected = sourcePrice?.gpu?.find((item) => item.type === getValues('gpu.type'));
    if (!selected) return;
    return {
      ...selected,
      inventory: countGpuInventory(selected.type)
    };
  };

  if (!isGpuTemplate || !sourcePrice?.gpu) {
    return null;
  }

  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="gpu.type"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-4">
              <FormLabel className="w-20">GPU</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    const selected = sourcePrice?.gpu?.find((item) => item.type === value);
                    const inventory = countGpuInventory(value);
                    if (value === '' || (selected && inventory > 0)) {
                      field.onChange(value);
                    }
                  }}
                >
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder={t('No GPU')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('No GPU')}</SelectItem>
                    {sourcePrice?.gpu.map((item) => {
                      const inventory = countGpuInventory(item.type);
                      return (
                        <SelectItem key={item.type} value={item.type} disabled={inventory <= 0}>
                          <div className="flex items-center gap-3">
                            {/* <Icons name="nvidia" className="h-4 w-4" /> */}
                            <span>{item.alias}</span>
                            <span className="text-gray-500">|</span>
                            <span className="text-gray-500">
                              {t('vm')}: {Math.round(item.vm)}G
                            </span>
                            <span className="text-gray-500">|</span>
                            <span className="text-gray-500">
                              {t('Inventory')}: <span className="text-[#FB7C3C]">{inventory}</span>
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </FormControl>
            </div>
          </FormItem>
        )}
      />

      {watch('gpu.type') && (
        <div className="pl-20">
          <p className="mb-2">{t('Amount')}</p>
          <div className="flex items-center">
            {GpuAmountMarkList.map((item) => {
              const inventory = selectedGpu()?.inventory || 0;
              const hasInventory = item.value <= inventory;

              return (
                <Tooltip key={item.value}>
                  <TooltipTrigger asChild>
                    <button
                      className={cn(
                        'mr-2 h-8 w-8 rounded-md border bg-white',
                        getValues('gpu.amount') === item.value
                          ? 'border-blue-500 shadow-[0px_0px_0px_2.4px_rgba(33,155,244,0.15)]'
                          : 'border-gray-200 bg-gray-100',
                        !hasInventory && 'cursor-not-allowed opacity-50'
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
                  </TooltipTrigger>
                  {!hasInventory && <TooltipContent>{t('Under Stock')}</TooltipContent>}
                </Tooltip>
              );
            })}
            <span className="ml-3 text-gray-500">/ {t('Card')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
