import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  SubscriptionPlan,
  PlanListResponse,
  SubscriptionInfoResponse,
  LastTransactionResponse,
  UpgradeAmountResponse,
  CardInfoResponse
} from '@/types/plan';

export interface PlanStoreState {
  // Data
  plansData: PlanListResponse | null;
  subscriptionData: SubscriptionInfoResponse | null;
  lastTransactionData: LastTransactionResponse | null;

  // Modal state
  pendingPlan: SubscriptionPlan | null;
  modalType: 'confirmation' | 'downgrade' | null;
  modalContext: {
    workspaceName?: string;
    isCreateMode?: boolean;
  };

  // Redeem code state
  redeemCode: string | null;
  redeemCodeDiscount: number | null;
  redeemCodeValidated: boolean;
  promotionCodeError: number | null;

  // Payment waiting state (integrated in PlanConfirmationModal)
  isPaymentWaiting: boolean;
  paymentWaitingWorkspace: string;
  paymentWaitingRegionDomain: string;
  paymentUrl: string | null;

  // Confirmation modal data
  upgradeAmountData: UpgradeAmountResponse | null;
  cardInfoData: CardInfoResponse | null;
  monthlyPrice: number | null;
  upgradeAmount: number | null;
  amountLoading: boolean;
  cardInfoLoading: boolean;

  // Data actions
  setPlansData: (data: PlanListResponse | null) => void;
  setSubscriptionData: (data: SubscriptionInfoResponse | null) => void;
  setLastTransactionData: (data: LastTransactionResponse | null) => void;

  // Modal actions
  showConfirmationModal: (
    plan: SubscriptionPlan,
    context?: { workspaceName?: string; isCreateMode?: boolean }
  ) => void;
  showDowngradeModal: (
    plan: SubscriptionPlan,
    context?: { workspaceName?: string; isCreateMode?: boolean }
  ) => void;
  hideModal: () => void;

  // Redeem code actions
  setRedeemCode: (code: string | null) => void;
  setRedeemCodeDiscount: (discount: number | null) => void;
  setRedeemCodeValidated: (validated: boolean) => void;
  setPromotionCodeError: (error: number | null) => void;
  clearRedeemCode: () => void;

  // Payment waiting actions
  startPaymentWaiting: (workspace: string, regionDomain: string, paymentUrl?: string) => void;
  stopPaymentWaiting: () => void;

  // Confirmation modal data actions
  setUpgradeAmountData: (data: UpgradeAmountResponse | null) => void;
  setCardInfoData: (data: CardInfoResponse | null) => void;
  setMonthlyPrice: (price: number | null) => void;
  setUpgradeAmount: (amount: number | null) => void;
  setAmountLoading: (loading: boolean) => void;
  setCardInfoLoading: (loading: boolean) => void;

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

    // Modal initial state
    pendingPlan: null,
    modalType: null,
    modalContext: {},

    // Redeem code initial state
    redeemCode: null,
    redeemCodeDiscount: null,
    redeemCodeValidated: false,
    promotionCodeError: null,

    // Payment waiting initial state
    isPaymentWaiting: false,
    paymentWaitingWorkspace: '',
    paymentWaitingRegionDomain: '',
    paymentUrl: null,

    // Confirmation modal data initial state
    upgradeAmountData: null,
    cardInfoData: null,
    monthlyPrice: null,
    upgradeAmount: null,
    amountLoading: false,
    cardInfoLoading: false,

    // Data actions
    setPlansData: (data) => set({ plansData: data }),
    setSubscriptionData: (data) => set({ subscriptionData: data }),
    setLastTransactionData: (data) => set({ lastTransactionData: data }),

    // Modal actions
    showConfirmationModal: (plan, context = {}) =>
      set((state) => {
        state.pendingPlan = plan;
        state.modalType = 'confirmation';
        state.modalContext = context;
        // Clear payment waiting state when opening modal
        state.isPaymentWaiting = false;
        state.paymentWaitingWorkspace = '';
        state.paymentWaitingRegionDomain = '';
        state.paymentUrl = null;
      }),

    showDowngradeModal: (plan, context = {}) =>
      set((state) => {
        state.pendingPlan = plan;
        state.modalType = 'downgrade';
        state.modalContext = context;
        // Clear payment waiting state when opening modal
        state.isPaymentWaiting = false;
        state.paymentWaitingWorkspace = '';
        state.paymentWaitingRegionDomain = '';
        state.paymentUrl = null;
      }),

    hideModal: () =>
      set({
        pendingPlan: null,
        modalType: null,
        modalContext: {}
      }),

    // Redeem code actions
    setRedeemCode: (code) => set({ redeemCode: code }),
    setRedeemCodeDiscount: (discount) => set({ redeemCodeDiscount: discount }),
    setRedeemCodeValidated: (validated) => set({ redeemCodeValidated: validated }),
    setPromotionCodeError: (error) => set({ promotionCodeError: error }),
    clearRedeemCode: () =>
      set({
        redeemCode: null,
        redeemCodeDiscount: null,
        redeemCodeValidated: false,
        promotionCodeError: null
      }),

    // Payment waiting actions
    startPaymentWaiting: (workspace, regionDomain, paymentUrl) =>
      set({
        isPaymentWaiting: true,
        paymentWaitingWorkspace: workspace,
        paymentWaitingRegionDomain: regionDomain,
        paymentUrl: paymentUrl || null
      }),

    stopPaymentWaiting: () =>
      set({
        isPaymentWaiting: false,
        paymentWaitingWorkspace: '',
        paymentWaitingRegionDomain: '',
        paymentUrl: null
      }),

    // Confirmation modal data actions
    setUpgradeAmountData: (data) => set({ upgradeAmountData: data }),
    setCardInfoData: (data) => set({ cardInfoData: data }),
    setMonthlyPrice: (price) => set({ monthlyPrice: price }),
    setUpgradeAmount: (amount) => set({ upgradeAmount: amount }),
    setAmountLoading: (loading) => set({ amountLoading: loading }),
    setCardInfoLoading: (loading) => set({ cardInfoLoading: loading }),

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
        lastTransactionData: null,
        pendingPlan: null,
        modalType: null,
        modalContext: {},
        redeemCode: null,
        redeemCodeDiscount: null,
        redeemCodeValidated: false,
        promotionCodeError: null,
        isPaymentWaiting: false,
        paymentWaitingWorkspace: '',
        paymentWaitingRegionDomain: '',
        paymentUrl: null,
        upgradeAmountData: null,
        cardInfoData: null,
        monthlyPrice: null,
        upgradeAmount: null,
        amountLoading: false,
        cardInfoLoading: false
      })
  }))
);

export default usePlanStore;
