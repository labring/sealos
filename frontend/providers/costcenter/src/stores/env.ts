import { Stripe, loadStripe } from '@stripe/stripe-js';
import { create } from 'zustand';
type EnvState = {
  rechargeEnabled: boolean;
  transferEnabled: boolean;
  invoiceEnabled: boolean;
  gpuEnabled: boolean;
  stripePromise: ReturnType<typeof loadStripe>;
  setRechargeEnabled: (enabled: boolean) => void;
  setTransferEnabled: (enabled: boolean) => void;
  setInvoiceEnabled: (enabled: boolean) => void;
  setGpuEnabled: (enabled: boolean) => void;
  setStripe: (pub: string) => void;
};
const useEnvStore = create<EnvState>((set, get) => ({
  rechargeEnabled: false,
  transferEnabled: false,
  invoiceEnabled: false,
  gpuEnabled: false,
  stripePromise: Promise.resolve(null),
  setRechargeEnabled: (enabled: boolean) => set({ rechargeEnabled: enabled }),
  setTransferEnabled: (enabled: boolean) => set({ transferEnabled: enabled }),
  setInvoiceEnabled: (enabled: boolean) => set({ invoiceEnabled: enabled }),
  setGpuEnabled(enabled) {
    set({ gpuEnabled: enabled });
  },
  setStripe: (pub: string) => set({ stripePromise: loadStripe(pub) })
}));

export default useEnvStore;
