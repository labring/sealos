'use client';

import { sealosApp } from 'sealos-desktop-sdk/app';
import { InsufficientQuotaDialogView } from './InsufficientQuotaDialogView';
import { useQuotaStore } from '../../../store/quota';
import type { SupportedLang } from '../../../i18n/quota-dialog';

export interface InsufficientQuotaDialogProps {
  /** Language for dialog content */
  lang: SupportedLang;
}

/**
 * Dialog component shown when quota is exceeded.
 *
 * @param props - Component props
 */
export function InsufficientQuotaDialog({ lang }: InsufficientQuotaDialogProps) {
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
      lang={lang}
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
