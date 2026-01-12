import { TAppSource } from '@/types/app';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import { sealosApp } from 'sealos-desktop-sdk/app';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@sealos/shadcn-ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@sealos/shadcn-ui/dialog';

const UpdateModal = ({
  isOpen,
  onClose,
  source
}: {
  isOpen: boolean;
  onClose: () => void;
  source?: TAppSource;
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const openTemplateApp = () => {
    if (!source?.hasSource) return;
    if (source.sourceType === 'sealaf') {
      sealosApp.runEvents('openDesktopApp', {
        appKey: 'system-sealaf',
        pathname: '/',
        query: { instanceName: source.sourceName }
      });
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[360px] text-foreground top-20 left-1/2 -translate-x-1/2 translate-y-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold leading-none">
            <TriangleAlert className="h-4 w-4 text-yellow-600" />
            {t('remind')}
          </DialogTitle>
        </DialogHeader>

        <div className="text-sm font-normal">{t('update_sealaf_app_tip')}</div>

        <DialogFooter>
          <Button variant="outline" className="shadow-none" onClick={onClose} size="lg">
            {t('Cancel')}
          </Button>
          <Button className="shadow-none" onClick={openTemplateApp} disabled={loading} size="lg">
            {t('confirm_to_go')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateModal;
