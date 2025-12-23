import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  WorkspaceQuotaItem,
  ExceededWorkspaceQuotaItem,
  WorkspaceQuotaItemType
} from '../types/workspace';
import { sealosApp } from 'sealos-desktop-sdk/app';
import type { SessionV1 } from 'sealos-desktop-sdk';

/**
 * @internal
 */
type QuotaGuardedConfig = {
  getSession: () => SessionV1 | null;
};

/**
 * @internal
 */
type State = {
  userQuota: WorkspaceQuotaItem[];
  setUserQuota: (quotas: WorkspaceQuotaItem[]) => void;
  fetchUserQuota: () => Promise<WorkspaceQuotaItem[]>;
  exceededQuotas: ExceededWorkspaceQuotaItem[];
  setExceededQuotas: (quotas: ExceededWorkspaceQuotaItem[]) => void;
  checkExceededQuotas: (
    request: Partial<Record<'cpu' | 'memory' | 'gpu' | 'nodeport' | 'storage', number>> & {
      traffic?: number | boolean;
    }
  ) => ExceededWorkspaceQuotaItem[];
  exceededPromptOpen: boolean;
  setExceededPromptOpen: (open: boolean) => void;
  showExceededPromptControls: boolean;
  setExceededPromptControls: (show: boolean) => void;
  exceededPromptCallback: (() => void) | null;
  setExceededPromptCallback: (callback: (() => void) | null) => void;
  showRequirements: WorkspaceQuotaItemType[];
  setShowRequirements: (types: WorkspaceQuotaItemType[]) => void;
  disallowClosing: boolean;
  setDisallowClosing: (disallow: boolean) => void;
  quotaGuardedConfig: QuotaGuardedConfig | null;
  setQuotaGuardedConfig: (config: QuotaGuardedConfig) => void;
};

/**
 * Zustand store for quota management.
 */

export const useQuotaStore = create<State>()(
  devtools(
    immer((set, get) => ({
      userQuota: [],
      setUserQuota: (quotas) => {
        set({
          userQuota: quotas
        });
      },
      fetchUserQuota: async () => {
        const response = await sealosApp.getWorkspaceQuota();
        return response.quota;
      },
      exceededQuotas: [],
      setExceededQuotas: (quotas) => {
        set({
          exceededQuotas: quotas
        });
      },
      checkExceededQuotas: (request) => {
        const quota = get().userQuota;

        const exceededItems: ExceededWorkspaceQuotaItem[] = quota
          .filter((item) => {
            if (!(item.type in request)) return false;

            const requestValue = request[item.type as keyof typeof request];
            if (item.type === 'traffic') {
              // For traffic, `true` means check any quota is exceeded (value > 0 is already met)
              if (requestValue === true) return item.limit - item.used < 1;
              // `false` = not provided
              if (requestValue === false) return false;
            }

            if (item.limit - item.used < (requestValue as number)) {
              return true;
            }
          })
          .map((item) => ({
            ...item,
            request:
              item.type === 'traffic' && request.traffic === true
                ? undefined
                : (request[item.type as keyof typeof request] as number)
          }));

        return exceededItems;
      },
      exceededPromptOpen: false,
      setExceededPromptOpen: (open) => {
        set({
          exceededPromptOpen: open
        });
      },
      showExceededPromptControls: true,
      setExceededPromptControls: (show) => {
        set({
          showExceededPromptControls: show
        });
      },
      exceededPromptCallback: null,
      setExceededPromptCallback: (callback) => {
        set({
          exceededPromptCallback: callback
        });
      },
      showRequirements: [],
      setShowRequirements: (types) => {
        set({
          showRequirements: types
        });
      },
      disallowClosing: false,
      setDisallowClosing: (disallow) => {
        set({
          disallowClosing: disallow
        });
      },
      quotaGuardedConfig: null,
      setQuotaGuardedConfig: (config) => {
        set({
          quotaGuardedConfig: config
        });
      }
    }))
  )
);
