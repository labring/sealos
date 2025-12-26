import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { shutdownDevbox } from '@/api/devbox';
import { DevboxDetailTypeV2, DevboxListItemTypeV2 } from '@/types/devbox';
import { useErrorMessage } from '@/hooks/useErrorMessage';
import ErrorModal from '@/components/ErrorModal';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@sealos/shadcn-ui/dialog';
import { Button } from '@sealos/shadcn-ui/button';
import { track } from '@sealos/gtm';

const BALANCE_NOT_ENOUGH = 402;
const FORBIDDEN_CREATE_APP = 403;
const APP_ALREADY_EXISTS = 409;

interface SimpleShutdownDialogProps {
  onSuccess: () => void;
  onClose: () => void;
  devbox: DevboxListItemTypeV2 | DevboxDetailTypeV2;
  open: boolean;
}

const SimpleShutdownDialog = ({ onSuccess, onClose, devbox, open }: SimpleShutdownDialogProps) => {
  const t = useTranslations();
  const { getErrorMessage } = useErrorMessage();
  const [loading, setLoading] = useState(false);
  const [errorModalState, setErrorModalState] = useState<{
    isOpen: boolean;
    errorCode?: number;
    errorMessage?: string;
  }>({
    isOpen: false
  });

  const handleShutdown = useCallback(async () => {
    try {
      setLoading(true);
      await shutdownDevbox({ devboxName: devbox.name, shutdownMode: 'Stopped' });
      toast.success(t('pause_success'));
      track({
        event: 'deployment_shutdown',
        module: 'devbox',
        context: 'app',
        type: 'cost_saving'
      });
      onSuccess();
    } catch (error: any) {
      console.error(error);
      const errorCode = error?.code;
      const errorMessage = error?.message || t('pause_error');

      if (
        errorCode === BALANCE_NOT_ENOUGH ||
        errorCode === FORBIDDEN_CREATE_APP ||
        errorCode === APP_ALREADY_EXISTS
      ) {
        setErrorModalState({
          isOpen: true,
          errorCode,
          errorMessage: t(errorMessage) || errorMessage
        });
      } else {
        toast.error(getErrorMessage(error, 'pause_error'));
      }
    }
    setLoading(false);
  }, [onSuccess, t, devbox.name, getErrorMessage]);

  return (
    <>
      <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="top-[10%] w-[350px] translate-y-0">
          <DialogHeader>
            <DialogTitle>{t('confirm_shutdown_question')}</DialogTitle>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button onClick={handleShutdown} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('confirm_shutdown')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ErrorModal
        isOpen={errorModalState.isOpen}
        onClose={() => setErrorModalState({ isOpen: false })}
        errorCode={errorModalState.errorCode}
        errorMessage={errorModalState.errorMessage}
      />
    </>
  );
};

export default SimpleShutdownDialog;
