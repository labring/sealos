import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { DBDetailType, DBListItemType, PodDetailType } from '@/types/db';
import { getMyJobList } from '@/api/job';
import { defaultDBDetail } from '@/constants/db';
import { CronJobListItemType } from '@/types/job';

type State = {
  jobList: CronJobListItemType[];
  setJobList: () => Promise<CronJobListItemType[]>;
  // dbDetail: DBDetailType;
  // loadDBDetail: (name: string, init?: boolean) => Promise<DBDetailType>;
  // dbPods: PodDetailType[];
  // intervalLoadPods: (dbName: string) => Promise<null>;
};

export const useJobStore = create<State>()(
  devtools(
    immer((set, get) => ({
      jobList: [],
      setJobList: async () => {
        const res = await getMyJobList();
        set((state) => {
          state.jobList = res;
        });
        return res;
      }
    }))
  )
);
