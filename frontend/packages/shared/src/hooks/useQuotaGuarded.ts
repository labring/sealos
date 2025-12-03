import { useQuotaStore } from '../store/quota';
import type { WorkspaceQuotaItemType } from '../types/workspace';
import type { SessionV1 } from 'sealos-desktop-sdk';

export type QuotaGuardedOptions = {
  requirements: Partial<Record<'cpu' | 'memory' | 'gpu' | 'nodeport' | 'storage', number>> & {
    traffic?: boolean | number;
  };
  immediate: boolean;
  allowContinue: boolean;
  showRequirements?: WorkspaceQuotaItemType[];
};

export type UseQuotaGuardedConfig = {
  getSession: () => SessionV1 | null;
};

/**
 * Factory function to register quota guarded configuration globally.
 * Call this once during app initialization (e.g., in _app.tsx or layout.tsx).
 */
export function createQuotaGuarded(config: UseQuotaGuardedConfig) {
  // Register the config globally
  useQuotaStore.getState().setQuotaGuardedConfig(config);
}

/**
 * Hook to guard actions with quota checking.
 * If createQuotaGuarded() was called during app initialization, config is optional.
 * Otherwise, config must be provided.
 */
export function useQuotaGuarded(
  options: QuotaGuardedOptions,
  callback: () => void,
  config?: UseQuotaGuardedConfig
) {
  const quotaStore = useQuotaStore();
  const globalConfig = quotaStore.quotaGuardedConfig;
  const finalConfig = config ?? globalConfig;

  if (!finalConfig) {
    throw new Error(
      'useQuotaGuarded: No config provided. Either call createQuotaGuarded() during app initialization, or pass config as the third argument.'
    );
  }

  const { getSession } = finalConfig;

  return () => {
    const session = getSession();
    const requirements = {
      ...options.requirements,
      traffic:
        typeof options.requirements.traffic === 'boolean'
          ? // 'boolean' => requires traffic to be not exhausted, automatically skip traffic check for PAYG plan
            options.requirements.traffic === true
            ? session?.subscription?.type === 'PAYG'
              ? undefined
              : (true as const) // Use `true` to indicate traffic quota check
            : undefined
          : // 'number' => use the exact requirement
            options.requirements.traffic
    };

    // [TODO] Add 'immediate' option
    quotaStore
      .fetchUserQuota()
      .then((quota) => {
        quotaStore.setUserQuota(quota);

        const exceededQuotas = quotaStore.checkExceededQuotas(requirements);

        if (exceededQuotas.length > 0) {
          quotaStore.setExceededQuotas(exceededQuotas);
          quotaStore.setExceededPromptControls(options.allowContinue);
          quotaStore.setShowRequirements(options.showRequirements || []);
          if (options.allowContinue) {
            quotaStore.setExceededPromptCallback(callback);
          } else {
            quotaStore.setExceededPromptCallback(null);
          }

          return true;
        }
        quotaStore.setExceededPromptCallback(null);
        return false;
      })
      .then((exceeded) => {
        quotaStore.setExceededPromptOpen(exceeded);

        if (!exceeded) {
          callback();
        }
      });
  };
}
