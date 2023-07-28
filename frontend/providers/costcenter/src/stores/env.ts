import { create } from 'zustand';
type EnvState = {
  rechargeEnabled: boolean;
  transferEnabled: boolean;
  invoiceEnabled: boolean;
  gpuEnabled: boolean;
  setRechargeEnabled: (enabled: boolean) => void;
  setTransferEnabled: (enabled: boolean) => void;
  setInvoiceEnabled: (enabled: boolean) => void;
  setGpuEnabled: (enabled: boolean) => void;
};
const useEnvStore = create<EnvState>((set, get) => ({
  rechargeEnabled: false,
  transferEnabled: false,
  invoiceEnabled: false,
  gpuEnabled: false,
  setRechargeEnabled: (enabled: boolean) => set({ rechargeEnabled: enabled }),
  setTransferEnabled: (enabled: boolean) => set({ transferEnabled: enabled }),
  setInvoiceEnabled: (enabled: boolean) => set({ invoiceEnabled: enabled }),
  setGpuEnabled(enabled) {
    set({ gpuEnabled: enabled });
  }
}));

export default useEnvStore;
