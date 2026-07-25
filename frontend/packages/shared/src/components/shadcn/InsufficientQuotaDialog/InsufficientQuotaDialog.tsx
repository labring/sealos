'use client';

import { useState, useEffect, useRef } from 'react';
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
  const isMountedRef = useRef(true);
  const currentSealosAppRef = useRef(sealosApp);

  useEffect(() => {
    currentSealosAppRef.current = sealosApp;

    if (!sealosApp) {
      setSubscriptionEnabled(true);
      return;
    }

    isMountedRef.current = true;
    const currentSealosApp = sealosApp;

    // [TODO]: Temporary workaround - ignore stale responses when sealosApp instance changes.
    // [FIXME]: SDK should always use the same instance. When re-initializing, the old instance
    //          gets destroyed but pending requests still wait for responses, causing timeouts.
    //          Should be fixed in init code (providers/*/src/pages/_app.tsx) to reuse the same instance.
    sealosApp
      .getHostConfig()
      .then((config) => {
        if (!isMountedRef.current || currentSealosAppRef.current !== currentSealosApp) {
          return;
        }
        setSubscriptionEnabled(config.features.subscription);
      })
      .catch(() => {
        if (!isMountedRef.current || currentSealosAppRef.current !== currentSealosApp) {
          return;
        }
        setSubscriptionEnabled(true);
      });

    return () => {
      isMountedRef.current = false;
    };
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
