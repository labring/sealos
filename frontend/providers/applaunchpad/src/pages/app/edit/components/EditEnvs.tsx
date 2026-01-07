import React, { useState, useCallback } from 'react';
import { useTranslation } from 'next-i18next';
import { AppEditType } from '@/types/app';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter
} from '@sealos/shadcn-ui/drawer';
import { Button } from '@sealos/shadcn-ui/button';
import { Textarea } from '@sealos/shadcn-ui/textarea';
import { Label } from '@sealos/shadcn-ui/label';

const EditEnvs = ({
  defaultEnv = [],
  successCb,
  onClose
}: {
  defaultEnv: AppEditType['envs'];
  successCb: (e: { key: string; value: string }[]) => void;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const [inputVal, setInputVal] = useState(
    defaultEnv
      .filter((item) => !item.valueFrom) // Only env that is not valuefrom can be edited
      .map((item) => `${item.key}=${item.value}`)
      .join('\n')
  );

  const onSubmit = useCallback(() => {
    const lines = inputVal.split('\n').filter((item) => item);
    const result = lines
      .map((str) => {
        // replace special symbol
        str = str.trim();
        if (/^-\s*/.test(str)) {
          str = str.replace(/^-\s*/, '');
        }
        if (str.includes('=')) {
          const i = str.indexOf('=');
          return [str.slice(0, i), str.slice(i + 1)];
        } else if (str.includes(':')) {
          const i = str.indexOf(':');
          return [str.slice(0, i), str.slice(i + 1)];
        }
        return '';
      })
      .filter((item) => item)
      .map((item) => {
        // remove quotation
        const key = item[0].replace(/^['"]|['"]$/g, '').trim();
        const value = item[1].replace(/^['"]|['"]$/g, '').trim();

        return {
          key,
          value
        };
      });

    // concat valueFrom env
    successCb([...defaultEnv.filter((item) => item.valueFrom), ...result]);
    onClose();
  }, [defaultEnv, inputVal, onClose, successCb]);

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent direction="right" className="min-w-[560px] sm:max-w-[560px]">
        <DrawerHeader>
          <DrawerTitle>{t('Edit Environment Variables')}</DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 min-h-0 px-6 py-6 flex flex-col gap-2">
          <Label className="text-sm font-medium text-zinc-900">{t('Environment Variables')}</Label>
          <Textarea
            className="resize-none flex-1 min-h-0 max-h-none h-full overflow-y-auto whitespace-pre-wrap font-mono text-sm bg-white shadow-none rounded-lg"
            value={inputVal}
            placeholder={t('Env Placeholder') || ''}
            onChange={(e) => setInputVal(e.target.value)}
          />
        </div>

        <DrawerFooter className="h-auto gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-10 min-w-20 rounded-lg shadow-none hover:bg-zinc-50"
          >
            {t('Cancel')}
          </Button>
          <Button onClick={onSubmit} className="h-10 min-w-20 rounded-lg shadow-none">
            {t('Confirm')}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default EditEnvs;
