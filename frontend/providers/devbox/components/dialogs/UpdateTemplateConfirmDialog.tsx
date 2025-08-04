import { useTranslations } from 'next-intl';
import { TriangleAlert } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface UpdateTemplateConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  version: string;
  template: string;
}

const UpdateTemplateConfirmDialog = ({
  open,
  onClose,
  onSuccess,
  version,
  template
}: UpdateTemplateConfirmModalProps) => {
  const t = useTranslations();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[360px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 text-yellow-600" />
            {t('prompt')}
          </DialogTitle>
        </DialogHeader>

        <div className="text-sm/5">
          {t.rich('overview_template_version_prompt', {
            version: (<span className="font-semibold">{version}</span>) as any,
            name: (<span className="font-semibold">{template}</span>) as any
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button
            onClick={() => {
              onSuccess();
              onClose();
            }}
          >
            {t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateTemplateConfirmDialog;
