import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { DBDetailType, DBListItemType, PodDetailType } from '@/types/db';
import { getMyDBList, getPodsByDBName, getDBByName, getMonitorData } from '@/api/db';
import { defaultDBDetail } from '@/constants/db';

type State = {
  dbList: DBListItemType[];
  setDBList: () => Promise<DBListItemType[]>;
  dbDetail: DBDetailType;
  loadDBDetail: (name: string, isFetchConfigMap?: boolean) => Promise<DBDetailType>;
  dbPods: PodDetailType[];
  intervalLoadPods: (dbName: string) => Promise<null>;
};

const getDiskOverflowStatus = async (dbName: string, dbType: string): Promise<boolean> => {
  try {
    const temp = await getMonitorData({
      dbName,
      dbType,
      queryKey: 'disk',
      start: Date.now() / 1000,
      end: Date.now() / 1000
    });
    const isDiskOverflow = temp?.result?.yData.some((item) =>
      item.data.some((value) => value >= 10)
    );
    return isDiskOverflow;
  } catch (error) {
    return false;
  }
};

export const useDBStore = create<State>()(
  devtools(
    immer((set, get) => ({
      dbList: [],
      setDBList: async () => {
        const res = await getMyDBList();

        for (const db of res) {
          if (db.status.value === 'Updating') {
            const isDiskOverflow = await getDiskOverflowStatus(db.name, db.dbType);
            db.isDiskSpaceOverflow = isDiskOverflow;
          }
        }

        set((state) => {
          state.dbList = res;
        });
        return res;
      },
      dbDetail: defaultDBDetail,
      async loadDBDetail(name: string) {
        try {
          const res = await getDBByName(name);

          if (res.status.value === 'Updating') {
            const isDiskOverflow = await getDiskOverflowStatus(res.dbName, res.dbType);
            res.isDiskSpaceOverflow = isDiskOverflow;
          }

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
