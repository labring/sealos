import { sealosApp } from 'sealos-desktop-sdk/app';
import {
  InsufficientQuotaDialogView,
  type InsufficientQuotaDialogI18n
} from './InsufficientQuotaDialogView';
import { useQuotaStore } from '../../../store/quota';

export interface InsufficientQuotaDialogProps {
  i18n: InsufficientQuotaDialogI18n;
}

export function InsufficientQuotaDialog({ i18n }: InsufficientQuotaDialogProps) {
  const quotaStore = useQuotaStore();

  const handleOpenCostcenter = () => {
    sealosApp.runEvents('openDesktopApp', {
      appKey: 'system-costcenter',
      pathname: '/',
      query: {
        mode: 'upgrade'
      },
      messageData: {
        type: 'InternalAppCall',
        mode: 'upgrade'
      }
    });
  };

  return (
    <InsufficientQuotaDialogView
      onOpenCostCenter={handleOpenCostcenter}
      items={quotaStore.exceededQuotas}
      open={quotaStore.exceededPromptOpen}
      onOpenChange={quotaStore.setExceededPromptOpen}
      showControls={quotaStore.showExceededPromptControls}
      showRequirements={quotaStore.showRequirements}
      i18n={i18n}
      onConfirm={
        quotaStore.exceededPromptCallback
          ? () => {
              quotaStore.exceededPromptCallback!();
              quotaStore.setExceededPromptOpen(false);
            }
          : () => {
              quotaStore.setExceededPromptOpen(false);
            }
      }
    />
  );
}
