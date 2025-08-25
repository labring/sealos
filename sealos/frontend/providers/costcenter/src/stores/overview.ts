import { END_TIME } from '@/constants/payment';
import { BillingItem } from '@/types/billing';
import { subDays } from 'date-fns';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
export enum By {
  month,
  week
}
type OverviewState = {
  balance: number;
  startTime: Date;
  endTime: Date;
  preItems: BillingItem[];
  items: BillingItem[];
  rechargeSource: number;
  setStartTime: (time: Date) => void;
  setEndTime: (time: Date) => void;
  setBalance: (balance: number) => void;
  setRecharge: (reCharge: number) => void;
};

const useOverviewStore = create<OverviewState>()(
  devtools(
    immer((set, get) => ({
      rechargeSource: 0,
      balance: 0,
      startTime: subDays(END_TIME, 7),
      endTime: END_TIME,
      preItems: [],
      items: [],
      setRecharge: (rechargeSource) => {
        set({ rechargeSource });
      },
      setStartTime: (time) => set({ startTime: time }),
      setEndTime: (time) => set({ endTime: time }),
      setBalance: (balance) => set({ balance })
    }))
  )
);

export default useOverviewStore;
