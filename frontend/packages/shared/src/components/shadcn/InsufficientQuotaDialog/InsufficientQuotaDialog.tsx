'use client';

import { useState, useEffect } from 'react';
import { InsufficientQuotaDialogView } from './InsufficientQuotaDialogView';
import { useQuotaStore } from '../../../store/quota';
import { useQuotaGuardConfig } from '../../../hooks/QuotaGuardProvider';
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
  const { sealosApp } = useQuotaGuardConfig();
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(true);

  useEffect(() => {
    if (!sealosApp) {
      // Default to true if sealosApp is not initialized
      setSubscriptionEnabled(true);
      return;
    }

    sealosApp
      .getHostConfig()
      .then((config) => {
        setSubscriptionEnabled(config.features.subscription);
      })
      .catch(() => {
        // Default to true if failed to get config
        setSubscriptionEnabled(true);
      });
  }, [sealosApp]);

  const handleOpenCostcenter = () => {
    if (!sealosApp) return;
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

  const openTicketsApp = () => {
    if (!sealosApp) return;
    sealosApp.runEvents('openDesktopApp', {
      appKey: 'system-workorder',
      pathname: '/'
    });
  };

  return (
    <InsufficientQuotaDialogView
      onOpenCostCenter={handleOpenCostcenter}
      onOpenTickets={openTicketsApp}
      subscriptionEnabled={subscriptionEnabled}
      items={quotaStore.exceededQuotas}
      open={quotaStore.exceededPromptOpen}
      onOpenChange={quotaStore.setExceededPromptOpen}
      showControls={quotaStore.showExceededPromptControls}
      showRequirements={quotaStore.showRequirements}
      lang={lang}
      disallowClosing={quotaStore.disallowClosing}
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
