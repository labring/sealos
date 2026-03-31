'use client';

import { useCallback } from 'react';
import { useQuotaStore } from '../store/quota';
import type { WorkspaceQuotaItemType } from '../types/workspace';
import { useQuotaGuardConfig, type UseQuotaGuardedConfig } from './QuotaGuardProvider';

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

type QuotaGuardedCallback = () => void | Promise<void>;

/**
 * Hook that returns a function to guard actions with quota checking.
 *
 * @param options - Quota checking options
 * @param callback - Action to execute if quota check passes
 * @returns Guarded action function
 * @throws {Error} If not used within QuotaGuardProvider
 */
export function useQuotaGuarded(options: QuotaGuardedOptions, callback: QuotaGuardedCallback) {
  const quotaGuardConfig = useQuotaGuardConfig();

  return useCallback(async (): Promise<void> => {
    // Skip quota checking during SSR/pre-rendering
    if (typeof window === 'undefined') {
      await Promise.resolve().then(() => callback());
      return;
    }

    await executeQuotaCheck(quotaGuardConfig, options, callback);
  }, [quotaGuardConfig, options, callback]);
}

async function executeQuotaCheck(
  config: UseQuotaGuardedConfig,
  options: QuotaGuardedOptions,
  callback: QuotaGuardedCallback
): Promise<boolean> {
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
  const quota = await quotaStore.fetchUserQuota(config.sealosApp);
  quotaStore.setUserQuota(quota);

  const exceededQuotas = quotaStore.checkExceededQuotas(requirements);
  const exceeded = exceededQuotas.length > 0;

  if (exceeded) {
    quotaStore.setExceededQuotas(exceededQuotas);
    quotaStore.setExceededPromptControls(options.allowContinue);
    quotaStore.setShowRequirements(options.showRequirements || []);
    quotaStore.setDisallowClosing(options.disallowClosing || false);
    quotaStore.setExceededPromptCallback(options.allowContinue ? callback : null);
  } else {
    quotaStore.setExceededPromptCallback(null);
    await Promise.resolve().then(() => callback());
  }

  quotaStore.setExceededPromptOpen(exceeded);
  return exceeded;
}
