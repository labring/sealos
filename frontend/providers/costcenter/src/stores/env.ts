import { loadStripe } from '@stripe/stripe-js';
import { create } from 'zustand';
type EnvState = {
  realNameRechargeLimit: boolean;
  rechargeEnabled: boolean;
  transferEnabled: boolean;
  invoiceEnabled: boolean;
  gpuEnabled: boolean;
  wechatEnabled: boolean;
  alipayEnabled: boolean;
  stripeEnabled: boolean;
  openRecharge: boolean;
  i18nIsInitialized: boolean;
  subscriptionEnabled: boolean;
  currency: 'shellCoin' | 'cny' | 'usd';
  billingInfo: {
    companyName: string;
    addressLines: string[];
    contactLines: string[];
  };
  invoiceDirectDownload: boolean;
  stripePromise: ReturnType<typeof loadStripe>;
  setStripe: (pub: string) => void;
  setEnv: <T extends Exclude<keyof EnvState, 'setEnv' | 'setStripe' | 'stripePromise'>>(
    key: T,
    value: EnvState[T]
  ) => void;
};

const useEnvStore = create<EnvState>((set, get) => ({
  realNameRechargeLimit: false,
  rechargeEnabled: false,
  transferEnabled: false,
  invoiceEnabled: false,
  wechatEnabled: false,
  alipayEnabled: false,
  stripeEnabled: false,
  gpuEnabled: false,
  openRecharge: false,
  i18nIsInitialized: false,
  subscriptionEnabled: false,
  currency: 'shellCoin',
  billingInfo: {
    companyName: '',
    addressLines: [],
    contactLines: []
  },
  invoiceDirectDownload: false,
  stripePromise: Promise.resolve(null),
  setStripe: (pub: string) => set({ stripePromise: loadStripe(pub) }),
  setEnv: (k, v) => set({ [k]: v })
}));

export default useEnvStore;
