import React, { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'next-i18next';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter
} from '@sealos/shadcn-ui/drawer';
import { Button } from '@sealos/shadcn-ui/button';
import { Input } from '@sealos/shadcn-ui/input';
import { Textarea } from '@sealos/shadcn-ui/textarea';
import { Label } from '@sealos/shadcn-ui/label';

export type ConfigMapType = {
  id?: string;
  mountPath: string;
  value: string;
  key: string;
  volumeName: string;
};

const ConfigmapModal = ({
  defaultValue = {
    mountPath: '',
    value: '',
    key: '',
    volumeName: ''
  },
  listNames,
  successCb,
  closeCb
}: {
  defaultValue?: ConfigMapType;
  listNames: string[];
  successCb: (e: ConfigMapType) => void;
  closeCb: () => void;
}) => {
  const { t } = useTranslation();
  const type = useMemo(() => (!defaultValue.id ? 'create' : 'edit'), [defaultValue]);
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: defaultValue
  });
  const textMap = {
    create: {
      title: 'Add'
    },
    edit: {
      title: 'Update'
    }
  };

  return (
    <Drawer open onOpenChange={(open) => !open && closeCb()}>
      <DrawerContent direction="right" className="min-w-[560px] sm:max-w-[560px]">
        <DrawerHeader>
          <DrawerTitle>
            {t(textMap[type].title)} {t('ConfigMap Tip')}
          </DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 min-h-0 px-6 py-6 flex flex-col gap-4">
          {/* Mount Path / Filename */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-zinc-900">{t('filename')}</Label>
            <Input
              className="h-10 bg-white rounded-lg shadow-none"
              placeholder={`${t('File Name')}: /etc/kubernetes/admin.conf`}
              {...register('mountPath', {
                required: t('Filename can not empty') || 'Filename can not empty',
                pattern: {
                  value: /^[0-9a-zA-Z_/][0-9a-zA-Z_/.-]*[0-9a-zA-Z_/]$/,
                  message: t('Mount Path Auth')
                },
                validate: (e) => {
                  if (listNames.includes(e.toLocaleLowerCase())) {
                    return t('ConfigMap Path Conflict') || 'ConfigMap Path Conflict';
                  }
                  return true;
                }
              })}
            />
            {errors.mountPath && <p className="text-sm text-red-500">{errors.mountPath.message}</p>}
          </div>

          {/* File Value */}
          <div className="flex-1 min-h-0 flex flex-col gap-2">
            <Label className="text-sm font-medium text-zinc-900">{t('file value')}</Label>
            <Textarea
              className="resize-none flex-1 min-h-0 max-h-none h-full overflow-y-auto whitespace-pre-wrap font-mono text-sm bg-white shadow-none rounded-lg"
              {...register('value', {
                required: t('File Value can not empty') || 'File Value can not empty'
              })}
              placeholder={t('File Value Placeholder') || ''}
            />
            {errors.value && <p className="text-sm text-red-500">{errors.value.message}</p>}
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
            onClick={handleSubmit(successCb)}
            className="h-10 min-w-20 rounded-lg shadow-none"
          >
            {t('Confirm')}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default ConfigmapModal;
