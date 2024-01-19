import { TBucket } from '@/consts';
import { S3, S3ClientConfig } from '@aws-sdk/client-s3';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
type State = {
  currentBucket?: TBucket;
  client?: S3;
  ak: string;
  prefix: Exclude<string, ''>[];
  setAk: (ak: string) => void;
  switchBucket: (bucket: TBucket) => void;
  initClient: (clientOptions: S3ClientConfig) => void;
  setPrefix: (prefix: string[]) => void;
  clearClient: () => void;
};

export const useOssStore = create<State>()(
  devtools(
    immer((set) => ({
      currentBucket: undefined,
      client: undefined,
      ak: '',
      prefix: [],
      setAk(ak) {
        set({ ak });
      },
      switchBucket: (bucket) => {
        set({ currentBucket: bucket, prefix: [] });
      },
      clearClient() {
        set({ client: undefined });
      },
      initClient: (clientOptions) => set({ client: new S3(clientOptions) }),
      setPrefix: (prefix: string[]) => set({ prefix })
    }))
  )
);
