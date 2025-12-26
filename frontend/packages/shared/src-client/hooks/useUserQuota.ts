import { useEffect, useCallback, useMemo } from 'react';
import { useQuotaStore } from '../store/quota';
import type {
  WorkspaceQuotaItemType,
  ExceededWorkspaceQuotaItem,
  WorkspaceQuotaItem
} from '../types/workspace';

export interface UseUserQuotaOptions {
  /** Resource requirements to check against */
  requirements?: Partial<Record<'cpu' | 'memory' | 'gpu' | 'nodeport' | 'storage', number>> & {
    traffic?: boolean | number;
  };
  /** Types to show in requirements dialog */
  showRequirements?: WorkspaceQuotaItemType[];
}

/**
 * @internal
 */
type UseUserQuotaReturn = {
  /** Current user quota items */
  userQuota: WorkspaceQuotaItem[];
  /** Refetch quota from server */
  refetch: () => Promise<WorkspaceQuotaItem[]>;
};

/**
 * @internal
 */
type UseUserQuotaWithCheckReturn = UseUserQuotaReturn & {
  /** Quotas that exceed requirements */
  exceededQuotas: ExceededWorkspaceQuotaItem[];
  /** Whether any quota is exceeded */
  isExceeded: boolean;
};

/**
 * Hook to access user quota. Fetches quota on mount.
 *
 * @returns Quota data and refetch function
 */
export function useUserQuota(): UseUserQuotaReturn;
/**
 * Hook to access user quota with requirement checking.
 *
 * @param options - Options with requirements
 * @returns Quota data, exceeded quotas, and refetch function
 * @public
 */
export function useUserQuota(
  options: UseUserQuotaOptions & { requirements: NonNullable<UseUserQuotaOptions['requirements']> }
): UseUserQuotaWithCheckReturn;
/**
 * @internal
 */
export function useUserQuota(
  options?: UseUserQuotaOptions
): UseUserQuotaReturn | UseUserQuotaWithCheckReturn {
  const { requirements, showRequirements = [] } = options || {};
  const {
    userQuota,
    fetchUserQuota,
    setUserQuota,
    checkExceededQuotas,
    setExceededQuotas,
    exceededQuotas,
    setShowRequirements
  } = useQuotaStore();

  const refetch = useCallback(async () => {
    const quota = await fetchUserQuota();
    setUserQuota(quota);
    return quota;
  }, [fetchUserQuota, setUserQuota]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const checkedExceededQuotas = useMemo(() => {
    if (!requirements || !userQuota || userQuota.length === 0) {
      return [];
    }
    return checkExceededQuotas(requirements);
  }, [userQuota, requirements, checkExceededQuotas]);

  useEffect(() => {
    if (requirements) {
      const needsUpdate =
        checkedExceededQuotas.length !== exceededQuotas.length ||
        checkedExceededQuotas.some(
          (item, index) =>
            exceededQuotas[index]?.type !== item.type ||
            exceededQuotas[index]?.limit !== item.limit ||
            exceededQuotas[index]?.used !== item.used
        );

      if (needsUpdate) {
        setExceededQuotas(checkedExceededQuotas);
        setShowRequirements(showRequirements);
      }
    }
  }, [
    requirements,
    checkedExceededQuotas,
    exceededQuotas,
    setExceededQuotas,
    showRequirements,
    setShowRequirements
  ]);

  if (requirements) {
    return {
      userQuota,
      exceededQuotas: checkedExceededQuotas,
      isExceeded: checkedExceededQuotas.length > 0,
      refetch
    };
  }

  return {
    userQuota,
    refetch
  };
}
