import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { DBDetailType, DBListItemType, PodDetailType, BackupItemType } from '@/types/db';
import { getMyDBList, getPodsByDBName, getDBByName } from '@/api/db';
import { defaultDBDetail } from '@/constants/db';
import { getBackupList } from '@/api/backup';

type State = {
  dbList: DBListItemType[];
  setDBList: () => Promise<DBListItemType[]>;
  dbDetail: DBDetailType;
  loadDBDetail: (name: string, init?: boolean) => Promise<DBDetailType>;
  dbPods: PodDetailType[];
  intervalLoadPods: (dbName: string) => Promise<string>;
  backups: BackupItemType[];
  intervalLoadBackups: (dbName: string) => Promise<string>;
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
        // get pod and update
        const pods = await getPodsByDBName(dbName);

        set((state) => {
          state.dbPods = pods;
        });

        return 'finish';
      },
      backups: [],
      intervalLoadBackups: async (dbName: string) => {
        if (!dbName) return Promise.reject('db name is empty');
        // get pod and update
        const backups = await getBackupList(dbName);
        console.log(backups);
        set((state) => {
          state.backups = backups;
        });

        return 'finish';
      }
    }))
  )
);
