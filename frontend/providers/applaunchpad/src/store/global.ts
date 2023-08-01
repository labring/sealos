import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Response as resourcePriceResponse } from '@/pages/api/platform/resourcePrice';
import { getResourcePrice } from '@/api/platform';

type State = {
  screenWidth: number;
  setScreenWidth: (e: number) => void;
  loading: boolean;
  setLoading: (val: boolean) => void;
  lastRoute: string;
  setLastRoute: (val: string) => void;
  userSourcePrice: resourcePriceResponse | undefined;
  getUserSourcePrice: () => Promise<null>;
  CpuSlideMarkList: {
    label: string;
    value: number;
  }[];
  MemorySlideMarkList: {
    label: string;
    value: number;
  }[];
  initFormSliderList: (res: { CPU_MARK_LIST?: string; MEMORY_MARK_LIST?: string }) => void;
};

let retryGetPrice = 3;

export const useGlobalStore = create<State>()(
  devtools(
    immer((set, get) => ({
      screenWidth: 1440,
      setScreenWidth(e: number) {
        set((state) => {
          state.screenWidth = e;
        });
      },
      loading: false,
      setLoading(val: boolean) {
        set((state) => {
          state.loading = val;
        });
      },
      lastRoute: '/',
      setLastRoute(val) {
        set((state) => {
          state.lastRoute = val;
        });
      },
      userSourcePrice: undefined,
      async getUserSourcePrice() {
        try {
          const res = await getResourcePrice();
          set((state) => {
            state.userSourcePrice = res;
          });
          console.log(res);
        } catch (err) {
          retryGetPrice--;
          if (retryGetPrice >= 0) {
            setTimeout(() => {
              get().getUserSourcePrice();
            }, 1000);
          }
        }
        return null;
      },
      CpuSlideMarkList: [
        { label: '0.1', value: 100 },
        { label: '0.2', value: 200 },
        { label: '0.5', value: 500 },
        { label: '1', value: 1000 },
        { label: '2', value: 2000 },
        { label: '3', value: 3000 },
        { label: '4', value: 4000 },
        { label: '8', value: 8000 }
      ],
      MemorySlideMarkList: [
        { label: '64Mi', value: 64 },
        { label: '128Mi', value: 128 },
        { label: '256Mi', value: 256 },
        { label: '512Mi', value: 512 },
        { label: '1G', value: 1024 },
        { label: '2G', value: 2048 },
        { label: '4G', value: 4096 },
        { label: '8G', value: 8192 },
        { label: '16G', value: 16384 }
      ],
      initFormSliderList(res) {
        try {
          const parseCpu = JSON.parse(res?.CPU_MARK_LIST || '');
          const parseMemory = JSON.parse(res?.MEMORY_MARK_LIST || '');
          set((state) => {
            state.CpuSlideMarkList = parseCpu;
            state.MemorySlideMarkList = parseMemory;
          });
        } catch (error) {}
      }
    }))
  )
);
