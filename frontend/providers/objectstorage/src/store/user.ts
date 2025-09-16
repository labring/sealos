import { WorkspaceQuotaItem } from '@/types/workspace';
import { sealosApp } from 'sealos-desktop-sdk/app';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type State = {
  userQuota: WorkspaceQuotaItem[];
  loadUserQuota: () => Promise<null>;
  checkExceededQuotas: (
    request: Partial<Record<'cpu' | 'memory' | 'gpu' | 'nodeport' | 'storage' | 'traffic', number>>
  ) => WorkspaceQuotaItem[];
};

export const useUserStore = create<State>()(
  devtools(
    immer((set, get) => ({
      userQuota: [],
      loadUserQuota: async () => {
        try {
          const response = await sealosApp.getWorkspaceQuota();

          set((state) => {
            state.userQuota = response.quota;
          });
        } catch (error) {
          console.warn('Failed to load user quota:', error);
          // Keep existing quota data or set empty array
          set((state) => {
            state.userQuota = state.userQuota || [];
          });
        }
        return null;
      },
      checkExceededQuotas: (request) => {
        const quota = get().userQuota;

        const exceededItems = quota.filter((item) => {
          if (!(item.type in request)) return false;

          if (item.limit - item.used < request[item.type as keyof typeof request]!) {
            return true;
          }
        });

        return exceededItems;
      }
    }))
  )
);
