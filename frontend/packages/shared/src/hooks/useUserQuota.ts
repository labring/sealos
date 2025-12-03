import { useEffect, useCallback, useMemo } from 'react';
import { useQuotaStore } from '../store/quota';
import type {
  WorkspaceQuotaItemType,
  ExceededWorkspaceQuotaItem,
  WorkspaceQuotaItem
} from '../types/workspace';

export interface UseUserQuotaOptions {
  requirements?: Partial<Record<'cpu' | 'memory' | 'gpu' | 'nodeport' | 'storage', number>> & {
    traffic?: boolean | number;
  };
  showRequirements?: WorkspaceQuotaItemType[];
}

type UseUserQuotaReturn = {
  userQuota: WorkspaceQuotaItem[];
  refetch: () => Promise<WorkspaceQuotaItem[]>;
};

type UseUserQuotaWithCheckReturn = UseUserQuotaReturn & {
  exceededQuotas: ExceededWorkspaceQuotaItem[];
  isExceeded: boolean;
};

/**
 * Hook for accessing user quota and optionally checking against requirements.
 * Automatically fetches quota on mount when used.
 */
export function useUserQuota(): UseUserQuotaReturn;
export function useUserQuota(
  options: UseUserQuotaOptions & { requirements: NonNullable<UseUserQuotaOptions['requirements']> }
): UseUserQuotaWithCheckReturn;
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
