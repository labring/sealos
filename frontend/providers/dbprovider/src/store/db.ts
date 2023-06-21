import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { DBDetailType, DBListItemType, PodDetailType } from '@/types/db';
import { getMyDBList, getPodsByDBName, getDBByName } from '@/api/db';
import { defaultDBDetail } from '@/constants/db';

type State = {
  dbList: DBListItemType[];
  setDBList: () => Promise<DBListItemType[]>;
  dbDetail: DBDetailType;
  loadDBDetail: (name: string, init?: boolean) => Promise<DBDetailType>;
  dbPods: PodDetailType[];
  intervalLoadPods: (dbName: string) => Promise<null>;
};

export const useDBStore = create<State>()(
  devtools(
    immer((set, get) => ({
      dbList: [],
      setDBList: async () => {
        const res = await getMyDBList();
        set((state) => {
          state.dbList = res;
        });
        return res;
      },
      dbDetail: defaultDBDetail,
      async loadDBDetail(name: string) {
        try {
          const res = await getDBByName(name);
          set((state) => {
            state.dbDetail = res;
          });
          return res;
        } catch (error) {
          return Promise.reject(error);
        }
      },
      dbPods: [],
      intervalLoadPods: async (dbName: string) => {
        if (!dbName) return Promise.reject('db name is empty');

        return getPodsByDBName(dbName).then((pods) => {
          set((state) => {
            state.dbPods = pods;
          });
          return null;
        });
      }
    }))
  )
);
