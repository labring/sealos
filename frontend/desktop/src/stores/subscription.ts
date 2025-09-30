import { SubscriptionInfoResponse } from '@/types/plan';
import { getPlanInfo } from '@/api/auth';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type SubscriptionState = {
  subscriptionInfo: SubscriptionInfoResponse | null;
  isLoading: boolean;
  error: string | null;

  fetchSubscriptionInfo: (workspace: string) => Promise<void>;
  clearSubscriptionInfo: () => void;
};

export const useSubscriptionStore = create<SubscriptionState>()(
  immer((set) => ({
    subscriptionInfo: null,
    isLoading: false,
    error: null,

    fetchSubscriptionInfo: async (workspace: string) => {
      if (!workspace) return;

      set((draft) => {
        draft.isLoading = true;
        draft.error = null;
      });

      try {
        const response = await getPlanInfo(workspace);
        set((draft) => {
          draft.subscriptionInfo = response.data;
          draft.isLoading = false;
          draft.error = null;
        });
      } catch (error) {
        set((draft) => {
          draft.isLoading = false;
          draft.error =
            error instanceof Error ? error.message : 'Failed to fetch subscription info';
        });
      }
    },

    clearSubscriptionInfo: () => {
      set((draft) => {
        draft.subscriptionInfo = null;
        draft.isLoading = false;
        draft.error = null;
      });
    }
  }))
);
