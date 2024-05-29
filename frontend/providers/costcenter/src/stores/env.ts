import { loadStripe } from '@stripe/stripe-js';
import { create } from 'zustand';
type EnvState = {
  rechargeEnabled: boolean;
  transferEnabled: boolean;
  invoiceEnabled: boolean;
  gpuEnabled: boolean;
  wechatEnabled: boolean;
  stripeEnabled: boolean;
  openRecharge: boolean;
  currency: 'shellCoin' | 'cny' | 'usd';
  stripePromise: ReturnType<typeof loadStripe>;
  setStripe: (pub: string) => void;
  setEnv: <T extends Exclude<keyof EnvState, 'setEnv' | 'setStripe' | 'stripePromise'>>(
    key: T,
    value: EnvState[T]
  ) => void;
};

const useEnvStore = create<EnvState>((set, get) => ({
  rechargeEnabled: false,
  transferEnabled: false,
  invoiceEnabled: false,
  wechatEnabled: false,
  stripeEnabled: false,
  gpuEnabled: false,
  openRecharge: false,
  currency: 'shellCoin',
  stripePromise: Promise.resolve(null),
  setStripe: (pub: string) => set({ stripePromise: loadStripe(pub) }),
  setEnv: (k, v) => set({ [k]: v })
}));

export default useEnvStore;
