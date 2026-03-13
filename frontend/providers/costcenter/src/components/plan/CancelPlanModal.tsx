import { useEffect, useMemo, useState } from 'react';
import { Button, Dialog, DialogContent, DialogOverlay, Input } from '@sealos/shadcn-ui';
import { LoaderCircle } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { formatTime } from '@/utils/format';

interface CancelPlanModalProps {
  isOpen: boolean;
  workspaceName: string;
  currentPeriodEndAt?: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export default function CancelPlanModal({
  isOpen,
  workspaceName,
  currentPeriodEndAt,
  isSubmitting = false,
  onClose,
  onConfirm
}: CancelPlanModalProps) {
  const { t } = useTranslation();
  const [confirmInput, setConfirmInput] = useState('');

  useEffect(() => {
    // Always reset local state when the dialog closes/opens or target changes,
    // to prevent dirty data when reopening the modal.
    setConfirmInput('');
  }, [isOpen, workspaceName]);

  const periodEndDate = useMemo(() => {
    if (!currentPeriodEndAt) return '';
    return formatTime(currentPeriodEndAt, 'yyyy-MM-dd');
  }, [currentPeriodEndAt]);

  const canConfirm = confirmInput === workspaceName && !isSubmitting;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setConfirmInput('');
          onClose();
        }
      }}
    >
      <DialogOverlay className="bg-[rgba(0,0,0,0.12)] backdrop-blur-sm" />
      <DialogContent className="max-w-[460px] p-6 gap-4">
        <div className="w-full">
          <h2 className="text-lg font-semibold text-zinc-900">
            {t('common:we_are_sorry_to_see_you_go')}
          </h2>
        </div>

        <div className="w-full flex flex-col gap-3">
          <div className="bg-orange-50 rounded-lg p-4 text-sm text-zinc-900">
            <span>{t('common:cancel_plan_warning_before_date')}</span>
            <span className="font-bold">{periodEndDate || '-'}</span>
            <span>{t('common:cancel_plan_warning_after_date')}</span>
            <span className="text-orange-600">{t('common:cancel_plan_warning_delete')}</span>
            <span>{t('common:cancel_plan_warning_after_delete')}</span>
          </div>

          <div className="w-full flex flex-col gap-2">
            <p className="text-sm text-zinc-900">
              {t('common:cancel_plan_enter_prefix')}{' '}
              <span className="font-semibold select-all cursor-pointer">{workspaceName}</span>{' '}
              {t('common:cancel_plan_enter_suffix')}
            </p>
            <Input
              className="bg-white"
              placeholder={workspaceName}
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="w-full flex justify-end gap-3">
          <Button
            variant="outline"
            className="w-fit"
            onClick={() => {
              setConfirmInput('');
              onClose();
            }}
            disabled={isSubmitting}
          >
            {t('common:keep_plan')}
          </Button>
          <Button
            variant="outline"
            className="w-fit text-red-600"
            onClick={() => onConfirm()}
            disabled={!canConfirm}
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                {t('common:canceling_plan')}
              </>
            ) : (
              t('common:cancel_plan')
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
