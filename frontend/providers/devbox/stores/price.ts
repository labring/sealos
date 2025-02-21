import { getResourcePrice } from '@/api/platform';
import { SourcePrice } from '@/types/static';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

const defaultSourcePrice: SourcePrice = {
  cpu: 0.067,
  memory: 0.033792,
  nodeports: 0.0001,
  gpu: []
};

type State = {
  sourcePrice: SourcePrice;
  setSourcePrice: () => Promise<SourcePrice>;
};

export const usePriceStore = create<State>()(
  devtools(
    immer((set, get) => ({
      sourcePrice: defaultSourcePrice,
      async setSourcePrice() {
        const res = await getResourcePrice();
        set((state) => {
          state.sourcePrice = res;
        });
        return res;
      }
    }))
  )
);
