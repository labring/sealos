import { toast } from 'sonner';
import { useCallback, useState, useEffect } from 'react';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

import { cn } from '@sealos/shadcn-ui';
import { useEnvStore } from '@/stores/env';
import { useDevboxStore } from '@/stores/devbox';
import { versionSchema, versionErrorEnum } from '@/utils/validate';
import { DevboxListItemTypeV2, DevboxVersionListItemType } from '@/types/devbox';
import { DevboxStatusEnum } from '@/constants/devbox';
import {
  releaseDevbox,
  shutdownDevbox,
  startDevbox,
  getDevboxVersionList,
  getDevboxByName
} from '@/api/devbox';
import { useErrorMessage } from '@/hooks/useErrorMessage';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@sealos/shadcn-ui/dialog';
import { Input } from '@sealos/shadcn-ui/input';
import { Label } from '@sealos/shadcn-ui/label';
import { Button } from '@sealos/shadcn-ui/button';
import { Textarea } from '@sealos/shadcn-ui/textarea';
import { Checkbox } from '@sealos/shadcn-ui/checkbox';
import { Separator } from '@sealos/shadcn-ui/separator';
import { track } from '@sealos/gtm';

interface ReleaseDialogProps {
  devbox: Omit<DevboxListItemTypeV2, 'template'>;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ReleaseDialog = ({ onClose, onSuccess, devbox, open }: ReleaseDialogProps) => {
  const t = useTranslations();
  const locale = useLocale();
  const { getErrorMessage } = useErrorMessage();

  const { env } = useEnvStore();
  const { setDevboxDetail } = useDevboxStore();

  const [tag, setTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);
  const [releaseDes, setReleaseDes] = useState('');
  const [isAutoStart, setIsAutoStart] = useState(devbox.status.value === 'Running');
  const [versionList, setVersionList] = useState<DevboxVersionListItemType[]>([]);

  useEffect(() => {
    if (open) {
      setTag('');
      setReleaseDes('');
      setTagError(null);
      setIsAutoStart(devbox.status.value === 'Running');

      getDevboxVersionList(devbox.name, devbox.id)
        .then((list) => {
          setVersionList(list);
        })
        .catch(console.error);
    }
  }, [open, devbox.name, devbox.id, devbox.status.value]);

  const validateTag = (value: string) => {
    if (!value) {
      return t('tag_required');
    }
    const result = versionSchema.safeParse(value);
    if (!result.success) {
      return result.error.issues[0].message === versionErrorEnum.INVALID_VERSION
        ? t('tag_format_error')
        : t('tag_length_error');
    }
    return null;
  };

  const handleTagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTag(value);
    setTagError(validateTag(value));
  };

  const handleSubmit = () => {
    const error = validateTag(tag);
    setTagError(error);
    if (error) {
      return;
    }

    const isDuplicate = versionList.some((version) => version.tag === tag);
    if (isDuplicate) {
      setTagError(t('tag_already_exists'));
      return;
    }

    handleReleaseDevbox(isAutoStart);
  };

  const handleReleaseDevbox = useCallback(
    async (startDevboxAfterRelease: boolean) => {
      try {
        setLoading(true);

        const isRunning = devbox.status.value === 'Running';

        // Step 1: Shutdown devbox if it's running (required before release)
        if (isRunning) {
          toast.info(t('auto_shutting_down'));

          await shutdownDevbox({
            devboxName: devbox.name,
            shutdownMode: 'Stopped'
          });

          // Poll devbox status for 2 minutes to ensure it's stopped
          const timeout = 2 * 60 * 1000; // 2 minutes
          const pollInterval = 3000; // 3 seconds
          const startTime = Date.now();
          let isStopped = false;

          while (Date.now() - startTime < timeout) {
            const devboxDetail = await getDevboxByName(devbox.name);
            if (devboxDetail.status.value === DevboxStatusEnum.Stopped) {
              isStopped = true;
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, pollInterval));
          }

          if (!isStopped) {
            throw new Error(t('devbox_shutdown_timeout'));
          }
        }

        // Step 2: Release devbox
        await releaseDevbox({
          devboxName: devbox.name,
          tag,
          releaseDes,
          devboxUid: devbox.id,
          startDevboxAfterRelease
        });

        // Step 3: If auto start is enabled, Go backend will start devbox
        // but won't modify ingress, so we need to resume ingress manually
        if (startDevboxAfterRelease) {
          await startDevbox({
            devboxName: devbox.name,
            onlyIngress: true
          });
          // Wait for Go backend to start devbox
          await new Promise((resolve) => setTimeout(resolve, 2000));
          // Refresh devbox detail to update status and restart polling
          await setDevboxDetail(devbox.name, env.sealosDomain);
        }

        toast.success(t('submit_release_successful'));
        track({
          event: 'release_create',
          module: 'devbox',
          context: 'app',
          release_number: versionList.length + 1
        });
        onSuccess();
        onClose();
      } catch (error: any) {
        toast.error(getErrorMessage(error, 'submit_release_failed'));
        console.error(error);
      }
      setLoading(false);
    },
    [
      devbox.status.value,
      devbox.name,
      devbox.id,
      tag,
      releaseDes,
      t,
      onSuccess,
      onClose,
      versionList.length,
      getErrorMessage,
      setDevboxDetail,
      env.sealosDomain
    ]
  );

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        setTag('');
        setReleaseDes('');
        setTagError(null);
        onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('release_version')}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-start gap-4 self-stretch">
          {/* prompt info */}
          <div className="flex w-full flex-col items-start gap-3 rounded-lg bg-zinc-100 p-4 text-sm/5">
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
            <div className="w-full">
              <Input
                placeholder={t('enter_version_number')}
                id="tag"
                value={tag}
                onChange={handleTagChange}
                maxLength={50}
                className={cn(tagError && 'border-red-500')}
              />
              <div className="mt-1 flex justify-between">
                <div className="text-sm text-red-500">{tagError}</div>
              </div>
            </div>
          </div>
          {/* description */}
          <div className="flex w-full flex-col items-start gap-2">
            <Label htmlFor="description">{t('version_description')}</Label>
            <div className="w-full">
              <Textarea
                id="description"
                value={releaseDes}
                onChange={(e) => setReleaseDes(e.target.value)}
                placeholder={t('enter_version_description')}
                className="w-[462px]"
                maxLength={500}
              />
              <div className="mt-1 text-right text-sm text-gray-500">{releaseDes.length}/500</div>
            </div>
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
