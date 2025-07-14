import { toast } from 'sonner';
import { useCallback, useState } from 'react';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

import { cn } from '@/lib/utils';
import { useEnvStore } from '@/stores/env';
import { useConfirm } from '@/hooks/useConfirm';
import { versionSchema } from '@/utils/validate';
import { DevboxListItemTypeV2 } from '@/types/devbox';
import { releaseDevbox, shutdownDevbox, startDevbox } from '@/api/devbox';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

interface ReleaseDialogProps {
  devbox: Omit<DevboxListItemTypeV2, 'template'>;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ReleaseDialog = ({ onClose, onSuccess, devbox, open }: ReleaseDialogProps) => {
  const t = useTranslations();
  const locale = useLocale();

  const { env } = useEnvStore();

  // TODO: all form need to be react-hook-form
  const [tag, setTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [tagError, setTagError] = useState(false);
  const [releaseDes, setReleaseDes] = useState('');
  const [isAutoStart, setIsAutoStart] = useState(devbox.status.value === 'Running');

  const handleSubmit = () => {
    const tagResult = versionSchema.safeParse(tag);
    if (!tag) {
      setTagError(true);
    } else if (versionSchema.safeParse(tag).success === false) {
      toast.error(t('tag_format_error'));
    } else {
      setTagError(false);
      handleReleaseDevbox(isAutoStart);
    }
  };

  const handleReleaseDevbox = useCallback(
    async (enableRestartMachine: boolean) => {
      try {
        setLoading(true);

        // 1.pause devbox
        if (devbox.status.value === 'Running') {
          await shutdownDevbox({
            devboxName: devbox.name,
            shutdownMode: 'Stopped'
          });
          // wait 3s
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
        // 2.release devbox
        await releaseDevbox({
          devboxName: devbox.name,
          tag,
          releaseDes,
          devboxUid: devbox.id
        });
        // 3.start devbox
        if (enableRestartMachine) {
          await startDevbox({ devboxName: devbox.name });
        }
        toast.success(t('submit_release_successful'));
        onSuccess();
        onClose();
      } catch (error: any) {
        toast.error(
          typeof error === 'string' ? error : error.message || t('submit_release_failed')
        );
        console.error(error);
      }
      setLoading(false);
    },
    [devbox.status.value, devbox.name, devbox.id, tag, releaseDes, t, onSuccess, onClose]
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="min-w-[450px]">
        <DialogHeader>
          <DialogTitle>{t('release_version')}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-start gap-4 self-stretch">
          {/* prompt info */}
          <div className="flex flex-col items-start gap-3 rounded-lg bg-zinc-100 p-4 text-sm/5">
            <div className="flex flex-col items-start gap-1">
              <span>{t('release_version_info')}</span>
              <div className="flex items-center gap-1">
                {t.rich('release_version_info_2', {
                  underline: (chunks) => (
                    <div
                      className="flex cursor-pointer items-center gap-0.5 text-blue-600 underline"
                      onClick={() => {
                        window.open(
                          locale === 'zh'
                            ? 'https://sealos.run/docs/guides/fundamentals/entrypoint-sh'
                            : 'https://sealos.io/docs/guides/fundamentals/entrypoint-sh',
                          '_blank'
                        );
                      }}
                    >
                      {chunks}
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                  )
                })}
              </div>
            </div>
            <Separator />
            <span>{t('devbox_pause_save_change')}</span>
            <div className="flex items-center gap-3">
              <Checkbox
                id="confirm-checkbox"
                checked={isAutoStart}
                onCheckedChange={(checked) =>
                  setIsAutoStart(checked === 'indeterminate' ? false : checked)
                }
              />
              <span>{t('auto_start_devbox')}</span>
            </div>
          </div>
          {/* image name */}
          <div className="flex w-full flex-col items-start gap-2">
            <Label htmlFor="image-name">{t('image_name')}</Label>
            <Input
              id="image-name"
              value={`${env.registryAddr}/${env.namespace}/${devbox.name}`}
              disabled
            />
          </div>
          {/* tag  */}
          <div className="flex w-full flex-col items-start gap-2">
            <Label htmlFor="tag" required>
              {t('version_number')}
            </Label>
            <Input
              placeholder={t('enter_version_number')}
              id="tag"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className={cn('mb-2', tagError && 'border-red-500')}
            />
            {/* TODO: ugly logic */}
            {tagError && <div className="text-sm text-red-500">{t('tag_required')}</div>}
          </div>
          {/* description */}
          <div className="flex w-full flex-col items-start gap-2">
            <Label htmlFor="description">{t('version_description')}</Label>
            <Textarea
              id="description"
              value={releaseDes}
              onChange={(e) => setReleaseDes(e.target.value)}
              placeholder={t('enter_version_description')}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant={'outline'} onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('release')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReleaseDialog;
