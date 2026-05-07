import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import { sealosApp } from 'sealos-desktop-sdk/app';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@sealos/shadcn-ui/dialog';
import { Button } from '@sealos/shadcn-ui/button';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorCode?: number;
  errorMessage?: string;
}

const BALANCE_NOT_ENOUGH = 402;
const FORBIDDEN_CREATE_APP = 403;
const APP_ALREADY_EXISTS = 409;

export default function ErrorModal({ isOpen, onClose, errorCode, errorMessage }: ErrorModalProps) {
  const t = useTranslations();

  const openCostCenterApp = () => {
    sealosApp.runEvents('openDesktopApp', {
      appKey: 'system-costcenter',
      query: {
        openRecharge: 'true'
      }
    });
  };

  const handleConfirm = () => {
    if (errorCode === BALANCE_NOT_ENOUGH) {
      openCostCenterApp();
    }
    onClose();
  };

  const getButtonText = () => {
    if (errorCode === BALANCE_NOT_ENOUGH) {
      return t('go_to_recharge');
    }
    return t('confirm');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="top-[10%] w-[400px] translate-y-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            {t('operation_failed')}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[50vh] overflow-auto text-sm whitespace-pre-wrap">{errorMessage}</div>

        <DialogFooter>
          <Button onClick={handleConfirm}>{getButtonText()}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
