import { TriangleAlert } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@sealos/shadcn-ui/dialog';
import { Button } from '@sealos/shadcn-ui/button';
import { Alert, AlertDescription } from '@sealos/shadcn-ui/alert';

export function DomainNotBoundModal({
  isOpen,
  onClose,
  onConfirm
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[410px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-semibold text-lg text-zinc-900 leading-none">
            <TriangleAlert className="w-4 h-4 text-yellow-600" />
            <span>{t('domain_not_bound_modal_title')}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Alert className="bg-orange-50 border-0 p-4">
            <AlertDescription className="text-orange-600">
              {t('domain_not_bound_modal_warning')}
            </AlertDescription>
          </Alert>

          <p className="text-sm text-zinc-900 font-normal">
            {t('domain_not_bound_modal_description')}
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="font-medium text-sm text-zinc-900 h-10 min-w-20 rounded-lg shadow-none hover:bg-zinc-50"
          >
            {t('domain_not_bound_modal_cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="font-medium text-sm h-10 min-w-20 rounded-lg shadow-none"
          >
            {t('domain_not_bound_modal_confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DomainNotBoundModal;
