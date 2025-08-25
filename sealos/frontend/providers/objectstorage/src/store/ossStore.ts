import { TBucket, UserSecretData } from '@/consts';
import { S3, S3ClientConfig } from '@aws-sdk/client-s3';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
type State = {
  currentBucket?: TBucket;
  client?: S3;
  isUpdating: boolean;
  prefix: Exclude<string, ''>[];
  secret?: UserSecretData;
  switchBucket: (bucket: TBucket) => void;
  setSecret: (secret: UserSecretData) => void;
  setIsUpdating: (isUpdating: boolean) => void;
  initClient: (clientOptions: S3ClientConfig) => void;
  setPrefix: (prefix: string[]) => void;
  clearClient: () => void;
};

export const useOssStore = create<State>()(
  devtools(
    immer((set) => ({
      currentBucket: undefined,
      client: undefined,
      secret: undefined,
      isUpdating: false,
      setSecret: (secret) => set({ secret }),
      prefix: [],
      switchBucket: (bucket) => {
        set({ currentBucket: bucket, prefix: [] });
      },
      clearClient() {
        set({ client: undefined });
      },
      setIsUpdating: (isUpdating) => set({ isUpdating }),
      initClient: (clientOptions) => set({ client: new S3(clientOptions) }),
      setPrefix: (prefix: string[]) => set({ prefix })
    }))
  )
);
