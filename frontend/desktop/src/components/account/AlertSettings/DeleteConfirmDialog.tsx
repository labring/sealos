'use client';

import { TriangleAlert } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@sealos/shadcn-ui';
import { Button } from '@sealos/shadcn-ui/button';
import { useTranslation } from 'next-i18next';

interface DeleteConfirmDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  phoneNumber?: string;
  email?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function DeleteConfirmDialog({
  open = false,
  onOpenChange,
  phoneNumber,
  email,
  onConfirm,
  onCancel
}: DeleteConfirmDialogProps) {
  const { t } = useTranslation();
  const handleConfirm = () => {
    onConfirm?.();
    onOpenChange?.(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[400px] p-6 rounded-2xl shadow-lg">
        <DialogHeader className="flex flex-row items-center gap-1.5">
          <TriangleAlert className="w-4 h-4 text-yellow-600" />
          <DialogTitle className="text-lg font-semibold leading-none text-zinc-900">
            {t('common:alert_settings.delete.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="text-sm leading-5 text-zinc-900">
          {phoneNumber ? (
            <>
              {
                // @ts-expect-error i18n typing issues
                t('common:alert_settings.delete.confirm_phone.0')
              }
              <span className="font-medium">{phoneNumber}</span>
              {
                // @ts-expect-error i18n typing issues
                t('common:alert_settings.delete.confirm_phone.1')
              }
            </>
          ) : email ? (
            <>
              {
                // @ts-expect-error i18n typing issues
                t('common:alert_settings.delete.confirm_email.0')
              }
              <span className="font-medium">{email}</span>
              {
                // @ts-expect-error i18n typing issues
                t('common:alert_settings.delete.confirm_email.1')
              }
            </>
          ) : (
            t('common:alert_settings.delete.confirm_generic')
          )}
        </div>

        <DialogFooter className="flex flex-row gap-3 justify-end">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="w-20 h-10 rounded-lg border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
          >
            {t('common:alert_settings.delete.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            className="w-20 h-10 rounded-lg bg-red-600 text-white hover:bg-red-700"
          >
            {t('common:alert_settings.delete.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
