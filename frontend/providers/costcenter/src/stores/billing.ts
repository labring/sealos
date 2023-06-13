import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
type BillingState = {
    cpu: number;
    memory: number;
    storage: number;
    UpdateCpu: (cpu: number) => void;
    UpdateMemory: (memory: number) => void;
    UpdateStorage: (storage: number) => void;
}
const useBillingStore = create<BillingState>((set, get) => ({
    cpu: 0,
    memory: 0,
    storage: 0,
    UpdateCpu: (cpu: number) => set({ cpu: cpu }),
    UpdateMemory: (memory: number) => set({ memory: memory }),
    UpdateStorage: (storage: number) => set({ storage: storage }),
})
)

export default useBillingStore;