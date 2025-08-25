import { CYCLE } from '@/constants/valuation';
import { Cycle } from '@/types/cycle';
import { RegionClient } from '@/types/region';
import { formatMoney } from '@/utils/format';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
type RechargeStore = {
  isProcess: boolean;
  paid: number;
  amount: number;
  resetProcess: () => void;
  setRechargeStatus: (data: { paid: number; amount: number }) => void;
};
const useRechargeStore = create<RechargeStore>()(
  persist(
    (set, get) => ({
      isProcess: false,
      paid: 0,
      amount: 0,
      setRechargeStatus: ({ paid, amount }) => {
        set({
          amount,
          isProcess: true,
          paid
        });
      },
      resetProcess: () => {
        set({
          isProcess: false,
          paid: 0,
          amount: 0
        });
      }
    }),
    {
      name: 'recharge-event-store'
    }
  )
);
export default useRechargeStore;
