import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { customAlphabet } from 'nanoid';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter
} from '@sealos/shadcn-ui/drawer';
import { Textarea } from '@sealos/shadcn-ui/textarea';
import { Input } from '@sealos/shadcn-ui/input';
import { Button } from '@sealos/shadcn-ui/button';
import { Label } from '@sealos/shadcn-ui/label';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 6);

interface ConfigMapDrawerProps {
  onClose: () => void;
  onSuccess: (configMap: { id?: string; path: string; content: string }) => void;
  initialValue?: { id?: string; path: string; content: string };
}

const ConfigMapDrawer = ({ onClose, onSuccess, initialValue }: ConfigMapDrawerProps) => {
  const t = useTranslations();
  const fileNameRef = useRef<HTMLInputElement>(null);
  const fileContentRef = useRef<HTMLTextAreaElement>(null);

  const [fileName] = useState(initialValue?.path || '');
  const [fileContent] = useState(initialValue?.content || '');

  const handleConfirm = () => {
    const path = fileNameRef.current?.value || '';
    const content = fileContentRef.current?.value || '';

    if (!path.trim()) {
      return;
    }

    onSuccess({
      id: initialValue?.id || nanoid(),
      path,
      content
    });
    onClose();
  };

  return (
    <Drawer open onOpenChange={onClose}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{initialValue ? t('edit_configmap') : t('add_configmap')}</DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-col gap-4 px-6 py-6">
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">{t('file_name')}</Label>
            <Input
              ref={fileNameRef}
              defaultValue={fileName}
              placeholder={t('file_name_placeholder')}
              className="h-10 bg-white"
            />
          </div>

          <div className="flex flex-1 flex-col gap-2">
            <Label className="text-sm font-medium">{t('file_content')}</Label>
            <Textarea
              ref={fileContentRef}
              defaultValue={fileContent}
              className="min-h-[68vh] flex-1 resize-none bg-white font-mono text-sm"
              placeholder={t('file_content')}
            />
          </div>
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

export default ConfigMapDrawer;
