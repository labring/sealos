import { formatMoney } from '@/utils/format';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
type EnvState = {
  rechargeEnabled: boolean;
  transferEnabled: boolean;
  invoiceEnabled: boolean;
  setRechargeEnabled: (enabled: boolean) => void;
  setTransferEnabled: (enabled: boolean) => void;
  setInvoiceEnabled: (enabled: boolean) => void;
};
const useEnvStore = create<EnvState>((set, get) => ({
  rechargeEnabled: false,
  transferEnabled: false,
  invoiceEnabled: false,
  setRechargeEnabled: (enabled: boolean) => set({ rechargeEnabled: enabled }),
  setTransferEnabled: (enabled: boolean) => set({ transferEnabled: enabled }),
  setInvoiceEnabled: (enabled: boolean) => set({ invoiceEnabled: enabled })
}));

export default useEnvStore;
