import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { END_TIME, NOW_MONTH, NOW_WEEK, NOW_YEAR, START_TIME } from '@/constants/payment';
import request from '@/service/request';
import { BillingData, BillingItem, BillingSpec } from '@/types/billing';
import {
  addDays,
  differenceInDays,
  format,
  formatISO,
  isAfter,
  isBefore,
  parseISO,
  subDays,
  subSeconds
} from 'date-fns';
import { INITAL_SOURCE } from '@/constants/billing';
import { formatMoney } from '@/utils/format';
export enum By {
  month,
  week
}
type OverviewState = {
  selectedMonth: number;
  selectedYear: number;
  selectedWeek: number;
  balance: number;
  source: any[][];
  cpu: number;
  storage: number;
  memory: number;
  startTime: Date;
  endTime: Date;
  preItems: BillingItem[];
  items: BillingItem[];
  reCharge: boolean;
  setMonth: (month: number) => void;
  setYear: (year: number) => void;
  setWeek: (week: number) => void;
  setStartTime: (time: Date) => void;
  setEndTime: (time: Date) => void;
  setSource: (source: any[][]) => void;
  updateSource: () => void;
  setBalance: (balance: number) => void;
  setRecharge: (reCharge: boolean) => void;
};

const useOverviewStore = create<OverviewState>()(
  devtools(
    immer((set, get) => ({
      selectedMonth: NOW_MONTH,
      selectedYear: NOW_YEAR,
      selectedWeek: NOW_WEEK,
      reCharge: false,
      balance: 0,
      cpu: -1,
      storage: -1,
      memory: -1,
      startTime: START_TIME,
      endTime: END_TIME,
      preItems: [],
      items: [],
      source: INITAL_SOURCE as any,
      setRecharge: (reCharge) => set({ reCharge }),
      setWeek: (week) => set({ selectedWeek: week }),
      setMonth: (month) => set({ selectedMonth: month }),
      setYear: (year) => set({ selectedYear: year }),
      setSource: (source) => set({ source: source }),
      setStartTime: (time) => set({ startTime: time }),
      setEndTime: (time) => set({ endTime: time }),
      setBalance: (balance) => set({ balance }),
      updateSource: async () => {
        const start = get().startTime;
        const end = subSeconds(addDays(get().endTime, 1), 1);
        const delta = differenceInDays(end, start);
        const pre = subDays(start, delta);
        const spec: BillingSpec = {
          startTime: formatISO(pre, { representation: 'complete' }),
          // pre,
          endTime: formatISO(end, { representation: 'complete' }),
          // start,
          page: 1,
          pageSize: 1_000_000_000,
          type: -1,
          orderID: ''
        };
        const { data } = await request<BillingData>('/api/billing', {
          method: 'POST',
          data: { spec }
        });

        set((state) => {
          state.source = INITAL_SOURCE as any;
          state.items = [];
          state.preItems = [];
          state.cpu = 0;
          state.storage = 0;
          state.memory = 0;
        });
        if (data.status.pageLength === 0) {
          return;
        }
        set((state) => {
          const deductionAmount = data.status.deductionAmount;
          state.cpu = deductionAmount.cpu;
          state.storage = deductionAmount.storage;
          state.memory = deductionAmount.memory;
          state.items = data.status.item;
          // 扣费source
          state.source.push(
            ...data.status.item
              .filter((item) => item.type === 0 && isAfter(parseISO(item.time), start))
              .map<[string, number, number, number, number]>((item) => [
                format(parseISO(item.time), 'yyyy-MM-dd'),
                // getTime(parseISO(item.time)),
                item.costs?.cpu || 0,
                item.costs?.memory || 0,
                item.costs?.storage || 0,
                item.amount
              ])
              .reduce<[string, number, number, number, number][]>((pre, cur) => {
                if (pre.length !== 0) {
                  const precost = pre[pre.length - 1];
                  if (precost[0] === cur[0]) {
                    precost[1] += cur[1];
                    precost[2] += cur[2];
                    precost[3] += cur[3];
                    precost[4] += cur[4];
                    return pre;
                  }
                }
                pre.push(cur);

                return pre;
              }, [])
              .map((x) => [
                x[0],
                formatMoney(x[1]),
                formatMoney(x[2]),
                formatMoney(x[3]),
                formatMoney(x[4])
              ])
              .reverse()
          );
          state.preItems = data.status.item.filter((item) => isBefore(parseISO(item.time), start));
        });
      }
    }))
  )
);

export default useOverviewStore;
