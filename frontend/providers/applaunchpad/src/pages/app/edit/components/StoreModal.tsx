import React, { useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'next-i18next';
import { mountPathToConfigMapKey } from '@/utils/tools';
import { Minus, Plus } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter
} from '@sealos/shadcn-ui/drawer';
import { Button } from '@sealos/shadcn-ui/button';
import { Input } from '@sealos/shadcn-ui/input';
import { Label } from '@sealos/shadcn-ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@sealos/shadcn-ui/tooltip';

export type StoreType = {
  id?: string;
  name: string;
  path: string;
  value: number;
};

const StoreModal = ({
  defaultValue = {
    name: '',
    path: '',
    value: 1
  },
  minValue,
  maxValue,
  listNames,
  isEditStore,
  successCb,
  closeCb
}: {
  defaultValue?: StoreType;
  minValue: number;
  maxValue: number;
  listNames: string[];
  isEditStore: boolean;
  successCb: (e: StoreType) => void;
  closeCb: () => void;
}) => {
  const { t } = useTranslation();
  const type = useMemo(() => (!!defaultValue.id ? 'create' : 'edit'), [defaultValue]);

  const {
    register,
    setValue,
    getValues,
    watch,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: defaultValue
  });

  const currentValue = watch('value');

  const textMap = {
    create: {
      title: `${t('Update')} ${t('Storage')}`
    },
    edit: {
      title: `${t('Add')} ${t('Storage')}`
    }
  };

  const clampValue = useCallback(
    (value: number) => {
      return Number.isSafeInteger(value) ? Math.min(maxValue, Math.max(value, minValue)) : minValue;
    },
    [minValue, maxValue]
  );

  const handleIncrement = () => {
    const current = getValues('value');
    if (current < maxValue) {
      setValue('value', current + 1);
    }
  };

  const handleDecrement = () => {
    const current = getValues('value');
    if (current > minValue) {
      setValue('value', current - 1);
    }
  };

  return (
    <Drawer open onOpenChange={(open) => !open && closeCb()}>
      <DrawerContent direction="right" className="min-w-[560px] sm:max-w-[560px]">
        <DrawerHeader>
          <DrawerTitle>{textMap[type].title}</DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 min-h-0 px-6 py-6 flex flex-col gap-4">
          {/* Capacity */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-zinc-900">{t('capacity')}</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center w-min relative">
                    <button
                      type="button"
                      onClick={handleDecrement}
                      disabled={maxValue === 0 || currentValue <= minValue}
                      className="w-10 h-10 flex items-center justify-center border rounded-l-lg bg-white hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <div className="relative">
                      <input
                        type="number"
                        disabled={maxValue === 0}
                        className="w-20 h-10 text-center border-t border-b border-zinc-200 bg-white text-sm font-medium focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        {...register('value', {
                          required:
                            t('Storage Value can not empty') || 'Storage Value can not empty',
                          min: {
                            value: minValue,
                            message: `${t('Min Storage Value')} ${minValue} Gi`
                          },
                          max: {
                            value: maxValue,
                            message: `${t('Max Storage Value')} ${maxValue} Gi`
                          },
                          valueAsNumber: true
                        })}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleIncrement}
                      disabled={maxValue === 0 || currentValue >= maxValue}
                      className="w-10 h-10 flex items-center justify-center border rounded-r-lg bg-white hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <span className="absolute -right-6 text-sm text-zinc-500 font-normal">Gi</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="rounded-xl">
                  <p className="text-sm text-zinc-900 font-normal p-2">
                    {maxValue === 0
                      ? t('Storage limit reached')
                      : `${t('Storage Range')}: ${minValue}~${maxValue} Gi`}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {errors.value && <p className="text-sm text-red-500">{errors.value.message}</p>}
          </div>

          {/* Mount Path */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-zinc-900">{t('mount path')}</Label>
            <Input
              className="h-10 bg-white rounded-lg shadow-none disabled:opacity-70 disabled:cursor-not-allowed"
              placeholder={t('form.storage_path_placeholder') || ''}
              title={isEditStore ? t('Can not change storage path') || '' : ''}
              disabled={isEditStore}
              {...register('path', {
                required: t('Storage path can not empty') || 'Storage path can not empty',
                pattern: {
                  value: /^[0-9a-zA-Z_/][0-9a-zA-Z_/.-]*[0-9a-zA-Z_/]$/,
                  message: t('Mount Path Auth')
                },
                validate: (e) => {
                  if (listNames.includes(e.toLocaleLowerCase())) {
                    return t('ConfigMap Path Conflict') || 'ConfigMap Path Conflict';
                  }
                  return true;
                },
                onChange(e) {
                  setValue('name', mountPathToConfigMapKey(e.target.value));
                }
              })}
            />
            {errors.path && <p className="text-sm text-red-500">{errors.path.message}</p>}
          </div>
        </div>

        <DrawerFooter className="h-auto gap-3">
          <Button
            variant="outline"
            onClick={closeCb}
            className="h-10 min-w-20 rounded-lg shadow-none hover:bg-zinc-50"
          >
            {t('Cancel')}
          </Button>
          <Button
            onClick={handleSubmit((e) => {
              successCb({
                id: e.id,
                name: e.name,
                path: e.path,
                value: clampValue(e.value)
              });
            })}
            className="h-10 min-w-20 rounded-lg shadow-none"
          >
            {t('Confirm')}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default StoreModal;
