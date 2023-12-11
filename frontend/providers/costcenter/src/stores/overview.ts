import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { END_TIME, NOW_MONTH, NOW_WEEK, NOW_YEAR, START_TIME } from '@/constants/payment';
import { BillingData, BillingItem, BillingSpec } from '@/types/billing';
import { Ref, useRef } from 'react';
import { subDays } from 'date-fns';
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
      startTime: subDays(END_TIME, 2),
      endTime: END_TIME,
      preItems: [],
      items: [],
      setRecharge: (rechargeSource) => {
        console.log('set');
        set({ rechargeSource });
      },
      setStartTime: (time) => set({ startTime: time }),
      setEndTime: (time) => set({ endTime: time }),
      setBalance: (balance) => set({ balance })
    }))
  )
);

export default useOverviewStore;
