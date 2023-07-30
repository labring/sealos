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
      }
    }))
  )
);
