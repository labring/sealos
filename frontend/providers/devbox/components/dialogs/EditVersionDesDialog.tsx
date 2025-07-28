import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useState, useEffect } from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { editDevboxVersion } from '@/api/devbox';
import { DevboxVersionListItemType } from '@/types/devbox';

interface EditVersionDesDialogProps {
  version: DevboxVersionListItemType;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EditVersionDesDialog = ({ version, onClose, open, onSuccess }: EditVersionDesDialogProps) => {
  const t = useTranslations();
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(version.description);

  useEffect(() => {
    setInputValue(version.description);
  }, [version.description]);

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
      <DialogContent className="min-w-[450px]">
        <DialogHeader>
          <DialogTitle>{t('edit_version_description')}</DialogTitle>
        </DialogHeader>

        <div className="flex w-full flex-col items-start gap-2">
          <Label htmlFor="description">{t('version_description')}</Label>
          {/* NOTE: must set specific width value,else the textarea will be too wide when single line text is too long */}
          <Textarea
            value={inputValue}
            id="description"
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t('enter_version_description')}
            className="w-[462px]"
          />
        </div>

        <DialogFooter>
          <Button variant={'outline'} onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button onClick={handleEditVersionDes} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditVersionDesDialog;
