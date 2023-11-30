// import { getCronJobByName, getCronJobList } from '@/api/job';
// import { DefaultJobEditValue } from '@/constants/job';
// import { CronJobEditType, CronJobListItemType } from '@/types/job';
import { TBucket, UserSecretData } from '@/consts';
import { S3, S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
type State = {
  currentBucket?: TBucket;
  client?: S3;
  prefix: Exclude<string, ''>[];
  switchBucket: (bucket: TBucket) => void;
  initClient: (clientOptions: S3ClientConfig) => void;
  setPrefix: (prefix: string[]) => void;
};

export const useOssStore = create<State>()(
  devtools(
    immer((set) => ({
      currentBucket: undefined,
      client: undefined,
      prefix: [],
      switchBucket: (bucket) => {
        set({ currentBucket: bucket, prefix: [] });
      },
      initClient: (clientOptions) => set({ client: new S3(clientOptions) }),
      setPrefix: (prefix: string[]) => set({ prefix })
    }))
  )
);
