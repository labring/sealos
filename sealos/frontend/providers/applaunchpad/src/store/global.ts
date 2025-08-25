import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { FormSliderListType } from '@/types';
import { defaultSliderKey } from '@/constants/app';

type State = {
  screenWidth: number;
  setScreenWidth: (e: number) => void;
  loading: boolean;
  setLoading: (val: boolean) => void;
  lastRoute: string;
  setLastRoute: (val: string) => void;
  formSliderListConfig: FormSliderListType;
  initFormSliderList: (e?: FormSliderListType) => void;
};

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
      formSliderListConfig: {
        [defaultSliderKey]: {
          cpu: [100, 200, 500, 1000, 2000, 3000, 4000, 8000],
          memory: [64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384]
        }
      },
      initFormSliderList(res) {
        if (!res) return;
        set((state) => {
          state.formSliderListConfig = res;
        });
      }
    }))
  )
);
