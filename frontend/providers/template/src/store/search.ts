import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type State = {
  searchValue: string;
  setSearchValue: (e: string) => void;
};

export const useSearchStore = create<State>()(
  devtools(
    immer((set, get) => ({
      searchValue: '',
      setSearchValue(e: string) {
        set((state) => {
          state.searchValue = e;
        });
      }
    }))
  )
);
