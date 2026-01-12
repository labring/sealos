import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@sealos/shadcn-ui/dialog';
import { Button } from '@sealos/shadcn-ui/button';
import { useTranslation } from 'next-i18next';
import { ResponseCode } from '@/types/response';
import { sealosApp } from 'sealos-desktop-sdk/app';
import { TriangleAlert } from 'lucide-react';

const ErrorModal = ({
  title,
  content,
  onClose,
  errorCode
}: {
  title: string;
  content: string;
  onClose: () => void;
  errorCode?: ResponseCode;
}) => {
  const { t } = useTranslation();

  const openCostCenterApp = () => {
    sealosApp.runEvents('openDesktopApp', {
      appKey: 'system-costcenter',
      query: {
        openRecharge: 'true'
      }
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[360px] text-foreground top-20 left-1/2 -translate-x-1/2 translate-y-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold leading-none">
            <TriangleAlert className="h-4 w-4 text-yellow-600" />
            {t(title)}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[50vh] overflow-auto whitespace-pre-wrap text-sm">{t(content)}</div>

        <DialogFooter>
          <Button variant="outline" size="lg" className="shadow-none" onClick={onClose}>
            {t('Cancel')}
          </Button>
          <Button
            size="lg"
            className="shadow-none"
            onClick={() => {
              if (errorCode === ResponseCode.BALANCE_NOT_ENOUGH) {
                openCostCenterApp();
              }
              onClose();
            }}
          >
            {errorCode === ResponseCode.BALANCE_NOT_ENOUGH ? t('add_credit') : t('Confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ErrorModal;
