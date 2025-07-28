import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface ShutdownDialogPros {
  onSuccess: () => void;
  onClose: () => void;
  devbox: DevboxListItemTypeV2 | DevboxDetailTypeV2;
  open: boolean;
}

const ShutdownDialog = ({ onSuccess, onClose, devbox, open }: ShutdownDialogPros) => {
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
      <DialogContent className="min-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('choose_shutdown_mode')}</DialogTitle>
        </DialogHeader>

        <RadioGroup
          value={shutdownMode}
          onValueChange={(value) => setShutdownMode(value as ShutdownModeType)}
          className="flex flex-col gap-2"
        >
          {/* normal mode */}
          <div
            className={cn(
              'flex cursor-pointer flex-col gap-1.5 rounded-xl border p-4',
              shutdownMode === 'Stopped' && 'border-zinc-900'
            )}
            onClick={() => setShutdownMode('Stopped')}
          >
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="Stopped" id="stopped" />
              <Label htmlFor="stopped">{t('normal_shutdown_mode')}</Label>
            </div>
            <div className="flex w-full items-start gap-1.5 pl-5">
              <span className="mt-1 aspect-square h-1.5 w-1.5 rounded-full bg-gray-300" />
              <span className="text-xs/4 text-zinc-500">
                {t.rich('normal_shutdown_mode_desc', {
                  black: (chunks) => <span className="text-zinc-900">{chunks}</span>
                })}
              </span>
            </div>
            <div className="flex w-full items-start gap-1.5 pl-5">
              <span className="mt-1 aspect-square h-1.5 w-1.5 rounded-full bg-gray-300" />
              <span className="text-xs/4 text-zinc-500">
                {t.rich('normal_shutdown_mode_desc_2', {
                  black: (chunks) => <span className="text-zinc-900">{chunks}</span>
                })}
              </span>
            </div>
          </div>

          {/* cold mode */}
          <div
            className={cn(
              'flex cursor-pointer flex-col gap-1.5 rounded-xl border p-4',
              shutdownMode === 'Shutdown' && 'border-zinc-900'
            )}
            onClick={() => setShutdownMode('Shutdown')}
          >
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="Shutdown" id="shutdown" />
              <Label htmlFor="shutdown">{t('cold_shutdown_mode')}</Label>
            </div>
            <div className="flex w-full items-start gap-1.5 pl-5">
              <span className="mt-1 aspect-square h-1.5 w-1.5 rounded-full bg-gray-300" />
              <span className="text-xs/4 text-zinc-500">
                {t.rich('cold_shutdown_mode_desc', {
                  black: (chunks) => <span className="text-zinc-900">{chunks}</span>
                })}
              </span>
            </div>
            <div className="flex w-full items-start gap-1.5 pl-5">
              <span className="mt-1 aspect-square h-1.5 w-1.5 rounded-full bg-gray-300" />
              <span className="text-xs/4 text-zinc-500">
                {t.rich('cold_shutdown_mode_desc_2', {
                  black: (chunks) => <span className="text-zinc-900">{chunks}</span>
                })}
              </span>
            </div>
          </div>
        </RadioGroup>

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
  );
};

export default ShutdownDialog;
