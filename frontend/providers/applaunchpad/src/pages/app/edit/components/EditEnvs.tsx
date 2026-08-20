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
import { parseDotenvEnvs, stringifyDotenvEnvs } from '@/utils/dotenvEnv';
import { Maximize2, Minimize2 } from 'lucide-react';

const envNameRegex = /^[-._a-zA-Z][-._a-zA-Z0-9]*$/;

const EditEnvs = ({
  defaultEnv = [],
  successCb,
  onClose
}: {
  defaultEnv: AppEditType['envs'];
  successCb: (e: AppEditType['envs']) => void;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputVal, setInputVal] = useState(
    stringifyDotenvEnvs(
      defaultEnv
        .filter((item) => !item.valueFrom) // Only env that is not valuefrom can be edited
        .map((item) => ({ key: item.key, value: item.value }))
        .filter((item) => item.key)
    )
  );
  const [errorMsg, setErrorMsg] = useState('');

  const onSubmit = useCallback(() => {
    const result = parseDotenvEnvs(inputVal);

    const invalidEnv = result.find((item) => !envNameRegex.test(item.key));
    if (invalidEnv) {
      setErrorMsg(
        t('Invalid Env Name', { name: invalidEnv.key }) || `Invalid env name: ${invalidEnv.key}`
      );
      return;
    }

    setErrorMsg('');
    // concat valueFrom env
    successCb([...defaultEnv.filter((item) => item.valueFrom), ...result]);
    onClose();
  }, [defaultEnv, inputVal, onClose, successCb, t]);

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent
        direction="right"
        className={
          isExpanded
            ? '!w-[calc(100vw-24px)] !max-w-none sm:!max-w-none'
            : 'min-w-[560px] sm:max-w-[560px]'
        }
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DrawerHeader className="flex-row items-center justify-between">
          <DrawerTitle>{t('Edit Environment Variables')}</DrawerTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={isExpanded ? 'Restore drawer size' : 'Expand drawer'}
            className="mr-8 h-8 w-8 shadow-none"
            onClick={() => setIsExpanded((value) => !value)}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </DrawerHeader>

        <div className="flex-1 min-h-0 px-6 py-6 flex flex-col gap-2">
          <Label className="text-sm font-medium text-zinc-900">{t('Environment Variables')}</Label>
          <Textarea
            className={`resize-none flex-1 min-h-0 max-h-none h-full overflow-auto whitespace-pre font-mono text-sm bg-white shadow-none rounded-lg ${
              errorMsg ? 'border-red-500' : ''
            }`}
            value={inputVal}
            wrap="off"
            placeholder={t('Env Placeholder') || ''}
            onChange={(e) => {
              setInputVal(e.target.value);
              if (errorMsg) setErrorMsg('');
            }}
          />
          {errorMsg && (
            <div className="text-sm text-red-500">
              <p>{errorMsg}</p>
            </div>
          )}
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
