import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Minus, Plus } from 'lucide-react';
import { customAlphabet } from 'nanoid';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter
} from '@sealos/shadcn-ui/drawer';
import { Input } from '@sealos/shadcn-ui/input';
import { Button } from '@sealos/shadcn-ui/button';
import { Label } from '@sealos/shadcn-ui/label';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 6);

interface NetworkStorageDrawerProps {
  onClose: () => void;
  onSuccess: (storage: { id?: string; path: string; size: number }) => void;
  initialValue?: { id?: string; path: string; size: number };
  existingPaths?: string[];
}

const NetworkStorageDrawer = ({
  onClose,
  onSuccess,
  initialValue,
  existingPaths = []
}: NetworkStorageDrawerProps) => {
  const t = useTranslations();
  const pathRef = useRef<HTMLInputElement>(null);
  const [capacity, setCapacity] = useState(initialValue?.size || 1);
  const [pathError, setPathError] = useState<string>('');

  const handleCapacityChange = (delta: number) => {
    setCapacity((prev) => Math.max(1, prev + delta));
  };

  const validatePath = (path: string): string => {
    if (!path.trim()) {
      return t('mount_path_cannot_be_empty');
    }

    const pathPattern = /^[0-9a-zA-Z_/][0-9a-zA-Z_/.-]*[0-9a-zA-Z_/]$/;
    if (!pathPattern.test(path)) {
      return t('mount_path_invalid_format');
    }

    if (existingPaths.includes(path.toLowerCase())) {
      return t('mount_path_conflict');
    }

    return '';
  };

  const handleConfirm = () => {
    const path = pathRef.current?.value || '';

    const error = validatePath(path);
    if (error) {
      setPathError(error);
      return;
    }

    setPathError('');
    onSuccess({
      id: initialValue?.id || nanoid(),
      path,
      size: capacity
    });
    onClose();
  };

  return (
    <Drawer open onOpenChange={onClose}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t('add_mounted_volumes')}</DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-col gap-4 px-6 py-6">
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">{t('storage_capacity')}</Label>
            <div className="flex items-center gap-3">
              <div className="flex items-center">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-tr-none rounded-br-none shadow-none"
                  onClick={() => handleCapacityChange(-1)}
                >
                  <Minus className="h-4 w-4 text-zinc-500" />
                </Button>
                <div className="flex h-10 w-20 items-center justify-center border-y border-zinc-200 bg-white">
                  <span className="text-sm font-medium">{capacity}</span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-tl-none rounded-bl-none shadow-none"
                  onClick={() => handleCapacityChange(1)}
                >
                  <Plus className="h-4 w-4 text-zinc-500" />
                </Button>
              </div>
              <span className="text-sm text-zinc-500">Gi</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">{t('mount_path')}</Label>
            <Input
              ref={pathRef}
              defaultValue={initialValue?.path || ''}
              placeholder={t('mount_path_placeholder')}
              className={`h-10 bg-white ${pathError ? 'border-red-500' : ''}`}
              onChange={() => setPathError('')}
            />
            {pathError && <p className="text-sm text-red-500">{pathError}</p>}
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

export default NetworkStorageDrawer;
