import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { editDevboxVersion } from '@/api/devbox';
import { DevboxVersionListItemType } from '@/types/devbox';

const EditVersionDesModal = ({
  version,
  onClose,
  open,
  onSuccess
}: {
  version: DevboxVersionListItemType;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const t = useTranslations();
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(version.description);

  const handleEditVersionDes = useCallback(async () => {
    try {
      setLoading(true);
      await editDevboxVersion({
        name: version.name,
        releaseDes: inputValue
      });
      toast.success(t('edit_successful'));
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(typeof error === 'string' ? error : error.message || t('edit_failed'));
      console.error(error);
    }
    setLoading(false);
  }, [version.name, inputValue, t, onSuccess, onClose]);

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="min-h-[300px] min-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('edit_version_description')}</DialogTitle>
        </DialogHeader>

        <div className="flex items-start gap-5 py-4">
          <div className="w-[100px]">{t('version_description')}</div>
          <Textarea
            value={inputValue}
            className="min-h-[150px]"
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t('enter_version_description')}
          />
        </div>

        <DialogFooter>
          <Button onClick={handleEditVersionDes} disabled={loading}>
            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditVersionDesModal;
