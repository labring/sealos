import { ApplicationType } from '@/types/app';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type State = {
  searchValue: string;
  appType: ApplicationType;
  setSearchValue: (e: string) => void;
  setAppType: (e: ApplicationType) => void;
};

export const useSearchStore = create<State>()(
  devtools(
    immer((set, get) => ({
      searchValue: '',
      appType: ApplicationType.All,
      setSearchValue(e: string) {
        set((state) => {
          state.searchValue = e;
        });
      },
      setAppType(e: ApplicationType) {
        set((state) => {
          state.appType = e;
        });
      }
    }))
  )
);
