import { useQuotaStore } from '../store/quota';
import type { WorkspaceQuotaItemType } from '../types/workspace';
import type { SessionV1 } from 'sealos-desktop-sdk';

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
};

export type UseQuotaGuardedConfig = {
  /** Function to get current session */
  getSession: () => SessionV1 | null;
};

/**
 * Initialize quota guard configuration. Call once in _app.tsx or layout.tsx.
 *
 * @param config - Configuration with session getter
 */
export function createQuotaGuarded(config: UseQuotaGuardedConfig): void {
  useQuotaStore.getState().setQuotaGuardedConfig(config);
}

/**
 * Hook that returns a function to guard actions with quota checking.
 *
 * @param options - Quota checking options
 * @param callback - Action to execute if quota check passes
 * @returns Guarded action function
 * @throws {Error} If config not initialized (client-side only)
 */
export function useQuotaGuarded(options: QuotaGuardedOptions, callback: () => void) {
  const quotaStore = useQuotaStore();
  const globalConfig = quotaStore.quotaGuardedConfig;
  const isSSR = typeof window === 'undefined';

  if (!globalConfig) {
    if (isSSR) {
      return () => callback();
    }
    throw new Error(
      'useQuotaGuarded: No config provided. Please call createQuotaGuarded() during app initialization (e.g., in _app.tsx or layout.tsx).'
    );
  }

  const { getSession } = globalConfig;

  return () => {
    // Skip quota checking during SSR/pre-rendering
    // The function will be called on the client side where quota checking is meaningful
    if (typeof window === 'undefined') {
      callback();
      return;
    }

    const session = getSession();
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
