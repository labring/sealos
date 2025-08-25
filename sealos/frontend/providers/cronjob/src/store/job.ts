import { getCronJobByName, getCronJobList } from '@/api/job';
import { DefaultJobEditValue } from '@/constants/job';
import { CronJobEditType, CronJobListItemType } from '@/types/job';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type State = {
  jobList: CronJobListItemType[];
  setJobList: () => Promise<CronJobListItemType[]>;
  JobDetail: CronJobEditType;
  loadJobDetail: (name: string, init?: boolean) => Promise<CronJobEditType>;
};

export const useJobStore = create<State>()(
  devtools(
    immer((set, get) => ({
      jobList: [],
      setJobList: async () => {
        const res = await getCronJobList();
        set((state) => {
          state.jobList = res;
        });
        return res;
      },
      JobDetail: { ...DefaultJobEditValue },
      async loadJobDetail(name: string) {
        try {
          const res = await getCronJobByName(name);
          set((state) => {
            state.JobDetail = res;
          });
          return res;
        } catch (error) {
          return Promise.reject(error);
        }
      }
    }))
  )
);
