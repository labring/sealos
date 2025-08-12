import { toast } from 'sonner';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateDevboxRemark } from '@/api/devbox';

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  devboxName: string;
  currentRemark?: string;
};

const EditRemarkDialog = ({ open, onClose, onSuccess, devboxName, currentRemark }: Props) => {
  const t = useTranslations();
  const [remark, setRemark] = useState(currentRemark || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      await updateDevboxRemark({
        devboxName,
        remark
      });
      toast.success('Update remark successfully');
      onSuccess();
    } catch (error) {
      console.error('Failed to update remark:', error);
      toast.error('Failed to update remark');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('edit_remark')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-zinc-900">{t('remark')}</span>
          <Input
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder={t('remark_input_placeholder')}
            maxLength={64}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditRemarkDialog;
