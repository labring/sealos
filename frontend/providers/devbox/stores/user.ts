import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { getUserIsOutStandingPayment } from '@/api/platform';
import { WorkspaceQuotaItem } from '@/types/workspace';
import { SessionV1 } from 'sealos-desktop-sdk';
import { sealosApp } from 'sealos-desktop-sdk/app';

type State = {
  session: SessionV1 | null;
  setSession: (session: SessionV1) => void;
  userQuota: WorkspaceQuotaItem[];
  isOutStandingPayment: boolean;
  loadUserQuota: () => Promise<null>;
  loadUserDebt: () => Promise<null>;
  checkExceededQuotas: (
    request: Partial<Record<'cpu' | 'memory' | 'gpu' | 'nodeport' | 'traffic', number>>
  ) => WorkspaceQuotaItem[];
};

export const useUserStore = create<State>()(
  devtools(
    immer((set, get) => ({
      session: null,
      setSession: (session: SessionV1) => {
        set({ session });
      },
      userQuota: [],
      isOutStandingPayment: false,
      loadUserQuota: async () => {
        const response = await sealosApp.getWorkspaceQuota();
        set((state) => {
          state.userQuota = response.quota;
        });
        return null;
      },
      loadUserDebt: async () => {
        const response = await getUserIsOutStandingPayment();

        set((state) => {
          state.isOutStandingPayment = response.isOutStandingPayment;
        });
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
