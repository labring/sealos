import React from 'react';
import { useTranslation } from 'next-i18next';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter
} from '@sealos/shadcn-ui/drawer';
import { Button } from '@sealos/shadcn-ui/button';

const ConfigMapDetailModal = ({
  mountPath,
  value,
  onClose
}: {
  mountPath: string;
  value: string;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <Drawer open onOpenChange={(open: boolean) => !open && onClose()}>
      <DrawerContent direction="right" className="min-w-[560px] sm:max-w-[560px]">
        <DrawerHeader>
          <DrawerTitle>
            {t('ConfigMap Tip')} {t('Details')}
          </DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 min-h-0 px-6 py-6">
          <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
            <table className="w-full table-fixed text-sm text-zinc-900">
              <tbody>
                <tr className="border-b border-zinc-200">
                  <td className="w-[120px] px-3 py-2 text-sm text-zinc-500 border-r border-zinc-200">
                    {t('filename')}
                  </td>
                  <td className="px-3 py-2 font-mono text-sm text-zinc-900">{mountPath}</td>
                </tr>
                <tr>
                  <td className="w-[120px] px-3 py-2 text-sm text-zinc-500 align-top border-r border-zinc-200">
                    {t('file value')}
                  </td>
                  <td className="px-3 py-2">
                    <pre className="whitespace-pre-wrap break-words font-mono text-sm text-zinc-900">
                      {value}
                    </pre>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ConfigMapDetailModal;
