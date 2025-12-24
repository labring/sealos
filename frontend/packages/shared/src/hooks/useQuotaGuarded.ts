import { useCallback } from 'react';
import { useQuotaStore } from '../store/quota';
import type { WorkspaceQuotaItemType, WorkspaceQuotaItem } from '../types/workspace';
import type { SessionV1 } from 'sealos-desktop-sdk';
import { useQuotaGuardConfig } from './QuotaGuardProvider';

export type QuotaGuardedOptions = {
  /** Resource requirements to check */
  requirements: Partial<Record<'cpu' | 'memory' | 'gpu' | 'nodeport' | 'storage', number>> & {
    traffic?: boolean | number;
  };
  /** Whether to check immediately */
  immediate: boolean;
  /** Allow user to continue despite quota exceeded */
  allowContinue: boolean;
  /** Types to show in requirements dialog */
  showRequirements?: WorkspaceQuotaItemType[];
  /** Disallow closing the dialog (hard intercept scenario) */
  disallowClosing?: boolean;
};

/**
 * Hook that returns a function to guard actions with quota checking.
 *
 * @param options - Quota checking options
 * @param callback - Action to execute if quota check passes
 * @returns Guarded action function
 * @throws {Error} If not used within QuotaGuardProvider
 */
export function useQuotaGuarded(options: QuotaGuardedOptions, callback: () => void) {
  const { getSession } = useQuotaGuardConfig();

  return useCallback(() => {
    // Skip quota checking during SSR/pre-rendering
    if (typeof window === 'undefined') {
      callback();
      return;
    }

    executeQuotaCheck({ getSession }, options, callback);
  }, [getSession, options, callback]);
}

function executeQuotaCheck(
  config: { getSession: () => SessionV1 | null },
  options: QuotaGuardedOptions,
  callback: () => void
) {
  const quotaStore = useQuotaStore.getState();
  const session = config.getSession();
  const requirements = {
    ...options.requirements,
    traffic:
      typeof options.requirements.traffic === 'boolean'
        ? // 'boolean' => requires traffic to be not exhausted, automatically skip traffic check for PAYG plan
          options.requirements.traffic === true
          ? session?.subscription?.type === 'PAYG'
            ? undefined
            : (true as const)
          : undefined
        : // 'number' => use the exact requirement
          options.requirements.traffic
  };

  // [TODO] Add support for 'immediate' option
  quotaStore
    .fetchUserQuota()
    .then((quota: WorkspaceQuotaItem[]) => {
      quotaStore.setUserQuota(quota);

      const exceededQuotas = quotaStore.checkExceededQuotas(requirements);

      if (exceededQuotas.length > 0) {
        quotaStore.setExceededQuotas(exceededQuotas);
        quotaStore.setExceededPromptControls(options.allowContinue);
        quotaStore.setShowRequirements(options.showRequirements || []);
        quotaStore.setDisallowClosing(options.disallowClosing || false);
        quotaStore.setExceededPromptCallback(options.allowContinue ? callback : null);
        return true;
      }

      quotaStore.setExceededPromptCallback(null);
      return false;
    })
    .then((exceeded: boolean) => {
      quotaStore.setExceededPromptOpen(exceeded);

      if (!exceeded) {
        callback();
      }
    });
}
