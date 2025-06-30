import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { delDevbox } from '@/api/devbox';
import { useIDEStore } from '@/stores/ide';
import { DevboxDetailTypeV2, DevboxListItemTypeV2 } from '@/types/devbox';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import MyIcon from '@/components/Icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const DelModal = ({
  devbox,
  onClose,
  refetchDevboxList,
  onSuccess
}: {
  devbox: DevboxListItemTypeV2 | DevboxDetailTypeV2;
  onClose: () => void;
  onSuccess: () => void;
  refetchDevboxList: () => void;
}) => {
  const t = useTranslations();
  const { removeDevboxIDE } = useIDEStore();

  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const handleDelDevbox = useCallback(async () => {
    try {
      setLoading(true);
      await delDevbox(devbox.name);
      removeDevboxIDE(devbox.name);
      toast.success(t('delete_successful'));
      onSuccess();
      onClose();

      let retryCount = 0;
      const maxRetries = 3;
      const retryInterval = 3000;

      const retry = async () => {
        if (retryCount < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryInterval));
          await refetchDevboxList();
          retryCount++;
        }
      };
      retry();
    } catch (error: any) {
      toast.error(typeof error === 'string' ? error : error.message || t('delete_failed'));
      console.error(error);
    }
    setLoading(false);
  }, [devbox.name, removeDevboxIDE, t, onSuccess, onClose, refetchDevboxList]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MyIcon name="warning" width={20} height={20} />
            {t('delete_warning')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <DialogDescription>{t('delete_warning_content')}</DialogDescription>

          <div className="rounded bg-gray-50 p-2 text-xs text-gray-600">
            {t('delete_warning_content_2')}
          </div>

          <div>
            {t.rich('please_enter_devbox_name_confirm', {
              name: devbox.name,
              strong: (chunks) => (
                <span className="inline-block font-bold select-all">{chunks}</span>
              )
            })}
          </div>

          <Input
            placeholder={devbox.name}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button
            variant="default"
            disabled={inputValue !== devbox.name || loading}
            onClick={handleDelDevbox}
          >
            {loading ? (
              <MyIcon name="loadingCircle" className="animate-spin" width={16} height={16} />
            ) : null}
            {t('confirm_delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DelModal;
