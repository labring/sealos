import { AlertCircle, LoaderCircle } from 'lucide-react';
import { Button, Dialog, DialogContent, DialogOverlay } from '@sealos/shadcn-ui';
import { useTranslation } from 'next-i18next';
import usePlanStore from '@/stores/plan';
import { PendingUpgrade } from '@/types/plan';

interface PendingUpgradeDialogProps {
  pendingUpgrade: PendingUpgrade;
  onContinuePayment: () => void;
  onCancelAndPayNew: () => void;
  isCanceling?: boolean;
}

export function PendingUpgradeDialog({
  pendingUpgrade,
  onContinuePayment,
  onCancelAndPayNew,
  isCanceling = false
}: PendingUpgradeDialogProps) {
  const { t } = useTranslation();
  const { showPendingUpgradeDialog } = usePlanStore();

  return (
    <Dialog
      open={showPendingUpgradeDialog}
      onOpenChange={() => {
        // Prevent closing dialog - only close after successful cancellation
      }}
    >
      <DialogOverlay className="bg-[rgba(0,0,0,0.12)] backdrop-blur-sm" />
      <DialogContent className="max-w-[500px] p-0 gap-0" showCloseButton={false}>
        <div className="flex flex-col gap-4 px-6 py-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-orange-500 shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {t('common:pending_upgrade_title')}
              </h2>
              <p className="text-sm text-gray-600">
                {t('common:pending_upgrade_message', { planName: pendingUpgrade.plan_name })}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              className="w-fit"
              onClick={onCancelAndPayNew}
              disabled={isCanceling}
            >
              {isCanceling ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  {t('common:canceling_invoice')}
                </>
              ) : (
                t('common:cancel_and_pay_new')
              )}
            </Button>
            <Button
              variant="default"
              className="w-fit"
              onClick={onContinuePayment}
              disabled={isCanceling}
            >
              {t('common:continue_payment')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
