import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter
} from '@sealos/shadcn-ui/drawer';
import { Textarea } from '@sealos/shadcn-ui/textarea';
import { Button } from '@sealos/shadcn-ui/button';
import { Label } from '@sealos/shadcn-ui/label';

interface EnvVariablesDrawerProps {
  onClose: () => void;
  onSuccess: (envVars: Array<{ key: string; value: string }>) => void;
  initialValue?: Array<{ key: string; value: string }>;
}

const EnvVariablesDrawer = ({ onClose, onSuccess, initialValue = [] }: EnvVariablesDrawerProps) => {
  const t = useTranslations();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const formatEnvVarsToText = (envVars: Array<{ key: string; value: string }>) => {
    return envVars.map((env) => `${env.key}=${env.value}`).join('\n');
  };

  const [value] = useState(formatEnvVarsToText(initialValue));

  const parseEnvVars = (text: string): Array<{ key: string; value: string }> => {
    const lines = text.split('\n').filter((line) => line.trim());
    const envVars: Array<{ key: string; value: string }> = [];

    for (const line of lines) {
      const separatorIndex = line.search(/[:=]/);
      if (separatorIndex === -1) continue;

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();

      if (key && value) {
        envVars.push({ key, value });
      }
    }

    return envVars;
  };

  const handleConfirm = () => {
    const text = textareaRef.current?.value || '';
    const envVars = parseEnvVars(text);
    onSuccess(envVars);
    onClose();
  };

  return (
    <Drawer open onOpenChange={onClose}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t('edit_environment_variables')}</DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-col gap-2 px-6 py-6">
          <Label className="text-sm font-medium">{t('environment_variables')}</Label>
          <Textarea
            ref={textareaRef}
            defaultValue={value}
            className="min-h-[75vh] resize-none bg-white font-mono text-sm"
            placeholder={`one per line, key and value separated by colon or equals sign,
e.g.:
mongoUrl=127.0.0.1:8000
redisUrl:127.0.0.0:8001
-enV1 =test`}
          />
        </div>

        <DrawerFooter className="flex flex-row justify-end gap-3 border-t px-6 py-4">
          <Button variant="outline" className="w-20" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button className="w-20" onClick={handleConfirm}>
            {t('confirm')}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default EnvVariablesDrawer;
