import { toast } from 'sonner';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import { useCallback, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface ReleaseModalProps {
  devbox: Omit<DevboxListItemTypeV2, 'template'>;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ReleaseModal = ({ onClose, onSuccess, devbox, open }: ReleaseModalProps) => {
  const t = useTranslations();
  const locale = useLocale();

  const { env } = useEnvStore();

  const [tag, setTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [tagError, setTagError] = useState(false);
  const [releaseDes, setReleaseDes] = useState('');

  const { openConfirm, ConfirmChild } = useConfirm({
    content: 'release_confirm_info',
    showCheckbox: true,
    checkboxLabel: 'pause_devbox_info',
    defaultChecked: devbox.status.value === 'Running'
  });

  const handleSubmit = () => {
    const tagResult = versionSchema.safeParse(tag);
    if (!tag) {
      setTagError(true);
    } else if (versionSchema.safeParse(tag).success === false) {
      toast.error(t('tag_format_error'));
    } else {
      setTagError(false);
      openConfirm((enableRestartMachine: boolean) => handleReleaseDevbox(enableRestartMachine))();
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
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="min-h-[300px] min-w-[500px]">
          <DialogHeader>
            <DialogTitle className="ml-3.5 flex items-center gap-2.5 text-base">
              {t('release_version')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 p-6">
            <div className="mb-6 flex items-center gap-2 rounded-md bg-blue-50 p-3">
              <div className="text-xs leading-4 font-medium tracking-wide text-blue-600">
                <div>{t('release_version_info')}</div>
                <div>
                  {t.rich('release_version_info_2', {
                    underline: (chunks) => (
                      <button
                        className="inline-block cursor-pointer text-xs font-medium text-blue-600 underline"
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
                        <ArrowUpRight className="mr-1.5 inline h-2.5 w-2.5" />
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="mb-6 flex items-start gap-4">
              <div className="w-[110px] text-lg font-bold">{t('image_name')}</div>
              <Input
                value={`${env.registryAddr}/${env.namespace}/${devbox.name}`}
                readOnly
                className="flex-1"
              />
            </div>

            <div className="flex items-start gap-4">
              <div className="w-[110px] text-lg font-bold">{t('version_config')}</div>
              <div className="flex flex-1 flex-col gap-1.5">
                <div className="w-[100px]">{t('version_number')}</div>
                <Input
                  placeholder={t('enter_version_number')}
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className={cn('mb-2', tagError && 'border-red-500')}
                />
                {tagError && <div className="text-sm text-red-500">{t('tag_required')}</div>}
                <div className="w-[100px]">{t('version_description')}</div>
                <Textarea
                  value={releaseDes}
                  className="min-h-[150px]"
                  onChange={(e) => setReleaseDes(e.target.value)}
                  placeholder={t('enter_version_description')}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleSubmit} className="mr-2.5 w-20" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('publish')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmChild />
    </>
  );
};

export default ReleaseModal;
