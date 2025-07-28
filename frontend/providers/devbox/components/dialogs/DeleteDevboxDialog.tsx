import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { Loader2, TriangleAlert } from 'lucide-react';

import { delDevbox } from '@/api/devbox';
import { useIDEStore } from '@/stores/ide';
import { DevboxDetailTypeV2, DevboxListItemTypeV2 } from '@/types/devbox';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface DeleteDevboxDialogProps {
  devbox: DevboxListItemTypeV2 | DevboxDetailTypeV2;
  onClose: () => void;
  onSuccess: () => void;
  refetchDevboxList: () => void;
}

const DeleteDevboxDialog = ({
  devbox,
  onClose,
  refetchDevboxList,
  onSuccess
}: DeleteDevboxDialogProps) => {
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

  // TODO：refactor this component to alert dialog
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 text-yellow-600" />
            {t('delete_warning')}
          </DialogTitle>
        </DialogHeader>

        <div className="text-sm/5">{t('delete_warning_content')}</div>

        <div className="rounded-lg bg-red-50 p-4 text-sm/5 text-red-600">
          {t('delete_warning_content_2')}
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm text-zinc-500">
            {t.rich('please_enter_devbox_name_confirm', {
              name: devbox.name,
              strong: (chunks) => (
                <span className="font-medium text-zinc-900 select-all">{chunks}</span>
              )
            })}
          </span>
          <Input
            placeholder={devbox.name}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button
            variant="destructive"
            disabled={inputValue !== devbox.name || loading}
            onClick={handleDelDevbox}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('confirm_delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteDevboxDialog;
