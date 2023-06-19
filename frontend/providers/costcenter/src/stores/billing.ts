import { formatMoney } from '@/utils/format';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
type BillingState = {
  cpu: number;
  memory: number;
  storage: number;
  updateCpu: (cpu: number) => void;
  updateMemory: (memory: number) => void;
  updateStorage: (storage: number) => void;
};
const useBillingStore = create<BillingState>((set, get) => ({
  cpu: 0,
  memory: 0,
  storage: 0,
  updateCpu: (cpu: number) => set({ cpu: formatMoney(cpu) }),
  updateMemory: (memory: number) => set({ memory: formatMoney(memory) }),
  updateStorage: (storage: number) => set({ storage: formatMoney(storage) })
}));

export default useBillingStore;
