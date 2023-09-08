import { formatMoney } from '@/utils/format';
import { create } from 'zustand';
type BillingState = {
  cpu: number;
  memory: number;
  storage: number;
  network: number;
  gpu: number;
  updateCpu: (cpu: number) => void;
  updateMemory: (memory: number) => void;
  updateStorage: (storage: number) => void;
  updateNetwork: (network: number) => void;
  updateGpu: (gpu: number) => void;
};
const useBillingStore = create<BillingState>((set) => ({
  cpu: 0,
  memory: 0,
  storage: 0,
  gpu: 0,
  network: 0,
  updateCpu: (cpu: number) => set({ cpu: formatMoney(cpu) }),
  updateMemory: (memory: number) => set({ memory: formatMoney(memory) }),
  updateStorage: (storage: number) => set({ storage: formatMoney(storage) }),
  updateNetwork: (network: number) => set({ network: formatMoney(network) }),
  updateGpu: (gpu: number) => set({ gpu: formatMoney(gpu) })
}));

export default useBillingStore;
