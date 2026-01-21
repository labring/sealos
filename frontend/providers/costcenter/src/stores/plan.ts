import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  SubscriptionPlan,
  PlanListResponse,
  SubscriptionInfoResponse,
  LastTransactionResponse,
  UpgradeAmountResponse,
  CardInfoResponse,
  PendingUpgrade
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
    operator?: 'created' | 'upgraded' | 'downgraded';
  };

  // Default values for modal opening (from URL params)
  defaultSelectedPlan: string;
  defaultShowPaymentConfirmation: boolean;
  defaultWorkspaceName: string;

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
  paymentWaitingInvoiceId: string | null; // Invoice ID for current payment waiting
  // Payment waiting timeout state
  paymentWaitingTimeout: boolean;
  paymentWaitingShouldStopPolling: boolean;
  paymentWaitingFirstDataTime: number | null;

  // Confirmation modal data
  upgradeAmountData: UpgradeAmountResponse | null;
  cardInfoData: CardInfoResponse | null;
  monthlyPrice: number | null;
  upgradeAmount: number | null;
  amountLoading: boolean;
  cardInfoLoading: boolean;

  // Pending upgrade state
  pendingUpgrade: PendingUpgrade | null;
  showPendingUpgradeDialog: boolean;

  // Invoice payment banner state
  invoicePaymentUrl: string | null;

  // Data actions
  setPlansData: (data: PlanListResponse | null) => void;
  setSubscriptionData: (data: SubscriptionInfoResponse | null) => void;
  setLastTransactionData: (data: LastTransactionResponse | null) => void;

  // Modal actions
  showConfirmationModal: (
    plan: SubscriptionPlan,
    context?: {
      workspaceName?: string;
      operator?: 'created' | 'upgraded' | 'downgraded';
    }
  ) => void;
  showDowngradeModal: (
    plan: SubscriptionPlan,
    context?: {
      workspaceName?: string;
      operator?: 'created' | 'upgraded' | 'downgraded';
    }
  ) => void;
  hideModal: () => void;

  // Redeem code actions
  setRedeemCode: (code: string | null) => void;
  setRedeemCodeDiscount: (discount: number | null) => void;
  setRedeemCodeValidated: (validated: boolean) => void;
  setPromotionCodeError: (error: number | null) => void;
  clearRedeemCode: () => void;

  // Payment waiting actions
  startPaymentWaiting: (
    workspace: string,
    regionDomain: string,
    paymentUrl?: string,
    invoiceId?: string
  ) => void;
  stopPaymentWaiting: () => void;
  // Payment waiting timeout actions
  setPaymentWaitingTimeout: (timeout: boolean) => void;
  setPaymentWaitingShouldStopPolling: (shouldStop: boolean) => void;
  setPaymentWaitingFirstDataTime: (time: number | null) => void;
  resetPaymentWaitingTimeout: () => void;

  // Confirmation modal data actions
  setUpgradeAmountData: (data: UpgradeAmountResponse | null) => void;
  setCardInfoData: (data: CardInfoResponse | null) => void;
  setMonthlyPrice: (price: number | null) => void;
  setUpgradeAmount: (amount: number | null) => void;
  setAmountLoading: (loading: boolean) => void;
  setCardInfoLoading: (loading: boolean) => void;

  // Pending upgrade actions
  setPendingUpgrade: (upgrade: PendingUpgrade | null) => void;
  setShowPendingUpgradeDialog: (show: boolean) => void;

  // Invoice payment banner actions
  setInvoicePaymentUrl: (url: string | null) => void;

  // Computed getters
  getCurrentPlan: () => SubscriptionPlan | null;
  getPlansMap: () => Map<string, SubscriptionPlan>;
  isPaygType: () => boolean;
  hasDowngradeTransaction: () => boolean;

  // Default values actions
  setDefaultSelectedPlan: (plan: string) => void;
  setDefaultShowPaymentConfirmation: (show: boolean) => void;
  setDefaultWorkspaceName: (name: string) => void;
  clearModalDefaults: () => void;

  // Reset functions
  resetAll: () => void;
  resetConfirmationModal: () => void;
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

    // Default values initial state
    defaultSelectedPlan: '',
    defaultShowPaymentConfirmation: false,
    defaultWorkspaceName: '',

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
    paymentWaitingInvoiceId: null,
    // Payment waiting timeout initial state
    paymentWaitingTimeout: false,
    paymentWaitingShouldStopPolling: false,
    paymentWaitingFirstDataTime: null,

    // Confirmation modal data initial state
    upgradeAmountData: null,
    cardInfoData: null,
    monthlyPrice: null,
    upgradeAmount: null,
    amountLoading: true,
    cardInfoLoading: false,

    // Pending upgrade initial state
    pendingUpgrade: null,
    showPendingUpgradeDialog: false,

    // Invoice payment banner initial state
    invoicePaymentUrl: null,

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
        // Reset amountLoading to true and clear upgradeAmount when opening modal to show loading state
        state.amountLoading = true;
        state.upgradeAmount = null;
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
        // Reset amountLoading to true and clear upgradeAmount when opening modal to show loading state
        state.amountLoading = true;
        state.upgradeAmount = null;
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
    startPaymentWaiting: (workspace, regionDomain, paymentUrl, invoiceId) =>
      set((state) => {
        state.isPaymentWaiting = true;
        state.paymentWaitingWorkspace = workspace;
        state.paymentWaitingRegionDomain = regionDomain;
        state.paymentUrl = paymentUrl || null;
        state.paymentWaitingInvoiceId = invoiceId || null;
        // Reset timeout state when starting payment waiting
        state.paymentWaitingTimeout = false;
        state.paymentWaitingShouldStopPolling = false;
        state.paymentWaitingFirstDataTime = null;
      }),

    stopPaymentWaiting: () =>
      set((state) => {
        state.isPaymentWaiting = false;
        state.paymentWaitingWorkspace = '';
        state.paymentWaitingRegionDomain = '';
        state.paymentUrl = null;
        state.paymentWaitingInvoiceId = null;
        // Reset timeout state when stopping payment waiting
        state.paymentWaitingTimeout = false;
        state.paymentWaitingShouldStopPolling = false;
        state.paymentWaitingFirstDataTime = null;
      }),

    // Payment waiting timeout actions
    setPaymentWaitingTimeout: (timeout) => set({ paymentWaitingTimeout: timeout }),
    setPaymentWaitingShouldStopPolling: (shouldStop) =>
      set({ paymentWaitingShouldStopPolling: shouldStop }),
    setPaymentWaitingFirstDataTime: (time) => set({ paymentWaitingFirstDataTime: time }),
    resetPaymentWaitingTimeout: () =>
      set({
        paymentWaitingTimeout: false,
        paymentWaitingShouldStopPolling: false,
        paymentWaitingFirstDataTime: null
      }),

    // Confirmation modal data actions
    setUpgradeAmountData: (data) => set({ upgradeAmountData: data }),
    setCardInfoData: (data) => set({ cardInfoData: data }),
    setMonthlyPrice: (price) => set({ monthlyPrice: price }),
    setUpgradeAmount: (amount) => set({ upgradeAmount: amount }),
    setAmountLoading: (loading) => set({ amountLoading: loading }),
    setCardInfoLoading: (loading) => set({ cardInfoLoading: loading }),

    // Pending upgrade actions
    setPendingUpgrade: (upgrade) => set({ pendingUpgrade: upgrade }),
    setShowPendingUpgradeDialog: (show) => set({ showPendingUpgradeDialog: show }),

    // Invoice payment banner actions
    setInvoicePaymentUrl: (url) => set({ invoicePaymentUrl: url }),

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
        paymentWaitingInvoiceId: null,
        paymentWaitingTimeout: false,
        paymentWaitingShouldStopPolling: false,
        paymentWaitingFirstDataTime: null,
        upgradeAmountData: null,
        cardInfoData: null,
        monthlyPrice: null,
        upgradeAmount: null,
        amountLoading: true,
        cardInfoLoading: false,
        pendingUpgrade: null,
        showPendingUpgradeDialog: false,
        invoicePaymentUrl: null,
        defaultSelectedPlan: '',
        defaultShowPaymentConfirmation: false,
        defaultWorkspaceName: ''
      }),

    // Default values actions
    setDefaultSelectedPlan: (plan) => set({ defaultSelectedPlan: plan }),
    setDefaultShowPaymentConfirmation: (show) => set({ defaultShowPaymentConfirmation: show }),
    setDefaultWorkspaceName: (name) => set({ defaultWorkspaceName: name }),
    clearModalDefaults: () =>
      set({
        defaultSelectedPlan: '',
        defaultShowPaymentConfirmation: false,
        defaultWorkspaceName: ''
      }),

    resetConfirmationModal: () =>
      set((state) => {
        // Reset confirmation modal related state
        state.redeemCode = null;
        state.redeemCodeDiscount = null;
        state.redeemCodeValidated = false;
        state.promotionCodeError = null;
        state.upgradeAmountData = null;
        state.cardInfoData = null;
        state.monthlyPrice = null;
        state.upgradeAmount = null;
        state.amountLoading = true;
        state.cardInfoLoading = false;
        state.pendingUpgrade = null;
        state.showPendingUpgradeDialog = false;
        // Don't reset payment waiting state here as it might be needed for retry
      })
  }))
);

export default usePlanStore;
