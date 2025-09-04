import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  SubscriptionPlan,
  PlanListResponse,
  SubscriptionInfoResponse,
  LastTransactionResponse
} from '@/types/plan';

export interface PlanStoreState {
  // Data
  plansData: PlanListResponse | null;
  subscriptionData: SubscriptionInfoResponse | null;
  lastTransactionData: LastTransactionResponse | null;

  // Actions
  setPlansData: (data: PlanListResponse | null) => void;
  setSubscriptionData: (data: SubscriptionInfoResponse | null) => void;
  setLastTransactionData: (data: LastTransactionResponse | null) => void;

  // Computed getters
  getCurrentPlan: () => SubscriptionPlan | null;
  getPlansMap: () => Map<string, SubscriptionPlan>;
  isPaygType: () => boolean;
  hasDowngradeTransaction: () => boolean;

  // Reset functions
  resetAll: () => void;
}

const usePlanStore = create<PlanStoreState>()(
  immer((set, get) => ({
    // Initial state
    plansData: null,
    subscriptionData: null,
    lastTransactionData: null,

    // Actions
    setPlansData: (data) => set({ plansData: data }),
    setSubscriptionData: (data) => set({ subscriptionData: data }),
    setLastTransactionData: (data) => set({ lastTransactionData: data }),

    // Computed getters
    getCurrentPlan: () => {
      const state = get();
      const currentPlanName = state.subscriptionData?.subscription?.PlanName;
      if (!currentPlanName || !state.plansData?.plans) return null;

      return state.plansData.plans.find((p) => p.Name === currentPlanName) || null;
    },

    getPlansMap: () => {
      const state = get();
      const plansMap = new Map<string, SubscriptionPlan>();

      if (state.plansData?.plans) {
        state.plansData.plans.forEach((plan) => {
          plansMap.set(plan.Name, plan);
        });
      }

      return plansMap;
    },

    isPaygType: () => {
      const state = get();
      return state.subscriptionData?.subscription?.type === 'PAYG';
    },

    hasDowngradeTransaction: () => {
      const state = get();
      return state.lastTransactionData?.transaction?.Operator === 'downgraded';
    },

    // Reset functions
    resetAll: () =>
      set({
        plansData: null,
        subscriptionData: null,
        lastTransactionData: null
      })
  }))
);

export default usePlanStore;
