import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { cn } from '@/lib/utils';
import { shutdownDevbox } from '@/api/devbox';
import { DevboxDetailTypeV2, DevboxListItemTypeV2, ShutdownModeType } from '@/types/devbox';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const ShutdownModal = ({
  onSuccess,
  onClose,
  devbox,
  open
}: {
  onSuccess: () => void;
  onClose: () => void;
  devbox: DevboxListItemTypeV2 | DevboxDetailTypeV2;
  open: boolean;
}) => {
  const t = useTranslations();
  const [loading, setLoading] = useState(false);
  const [shutdownMode, setShutdownMode] = useState<ShutdownModeType>('Stopped');

  const handleShutdown = useCallback(async () => {
    try {
      setLoading(true);
      await shutdownDevbox({ devboxName: devbox.name, shutdownMode });
      toast.success(t('pause_success'));
      onSuccess();
    } catch (error: any) {
      toast.error(typeof error === 'string' ? error : error.message || t('pause_error'));
      console.error(error);
    }
    setLoading(false);
  }, [onSuccess, t, devbox.name, shutdownMode]);

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="min-h-[300px] min-w-[500px]">
        <DialogHeader>
          <DialogTitle className="ml-3.5 text-base">{t('choose_shutdown_mode')}</DialogTitle>
        </DialogHeader>

        <div className="p-4">
          <RadioGroup
            value={shutdownMode}
            onValueChange={(value) => setShutdownMode(value as ShutdownModeType)}
            className="flex flex-col gap-4"
          >
            {/* normal mode */}
            <div
              className={cn(
                'cursor-pointer rounded-lg border p-3',
                shutdownMode === 'Stopped'
                  ? 'border-blue-500 shadow-[0px_0px_0px_2.4px_rgba(33,155,244,0.15)]'
                  : 'border-gray-300'
              )}
              onClick={() => setShutdownMode('Stopped')}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Stopped" id="stopped" />
                <label htmlFor="stopped" className="text-sm font-medium text-gray-900">
                  {t('normal_shutdown_mode')}
                </label>
              </div>
              <div className="mt-2 space-y-0.5 pl-5 text-xs text-gray-600">
                <div className="flex items-start gap-1.5">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gray-300" />
                  <div>
                    {t.rich('normal_shutdown_mode_desc', {
                      yellow: (chunks) => (
                        <span className="font-medium text-yellow-500">{chunks}</span>
                      )
                    })}
                  </div>
                </div>
                <div className="flex items-start gap-1.5">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gray-300" />
                  <div>
                    {t.rich('normal_shutdown_mode_desc_2', {
                      yellow: (chunks) => (
                        <span className="font-medium text-yellow-500">{chunks}</span>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* cold mode */}
            <div
              className={cn(
                'cursor-pointer rounded-lg border p-3',
                shutdownMode === 'Shutdown'
                  ? 'border-blue-500 shadow-[0px_0px_0px_2.4px_rgba(33,155,244,0.15)]'
                  : 'border-gray-300'
              )}
              onClick={() => setShutdownMode('Shutdown')}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Shutdown" id="shutdown" />
                <label htmlFor="shutdown" className="text-sm font-medium text-gray-900">
                  {t('cold_shutdown_mode')}
                </label>
              </div>
              <div className="mt-2 space-y-0.5 pl-5 text-xs text-gray-600">
                <div className="flex items-start gap-1.5">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gray-300" />
                  <div>
                    {t.rich('cold_shutdown_mode_desc', {
                      yellow: (chunks) => (
                        <span className="font-medium text-yellow-500">{chunks}</span>
                      )
                    })}
                  </div>
                </div>
                <div className="flex items-start gap-1.5">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gray-300" />
                  <div>
                    {t.rich('cold_shutdown_mode_desc_2', {
                      yellow: (chunks) => (
                        <span className="font-medium text-yellow-500">{chunks}</span>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button onClick={handleShutdown} disabled={loading} className="mt-2.5">
            {loading && (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
            )}
            {t('confirm_shutdown')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShutdownModal;
