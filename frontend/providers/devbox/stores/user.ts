import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { getUserQuota } from '@/api/platform';
import { DevboxEditType } from '@/types/devbox';
import { UserQuotaItemType } from '@/types/user';
type TQuota = Pick<DevboxEditType, 'memory' | 'cpu' | 'gpu'> & { nodeports: number };
type State = {
  balance: number;
  userQuota: UserQuotaItemType[];
  loadUserQuota: () => Promise<null>;
  checkQuotaAllow: (request: TQuota, usedData?: TQuota) => string | undefined;
};

export const useUserStore = create<State>()(
  devtools(
    immer((set, get) => ({
      balance: 5,
      userQuota: [],
      loadUserQuota: async () => {
        const response = await getUserQuota();
        set((state) => {
          state.userQuota = response.quota;
        });
        return null;
      },
      checkQuotaAllow: ({ cpu, memory, nodeports, gpu }, usedData): string | undefined => {
        const quote = get().userQuota;

        const request = {
          cpu: cpu / 1000,
          memory: memory / 1024,
          nodeports: nodeports,
          gpu: gpu?.type ? gpu.amount : 0
        };

        if (usedData) {
          const { cpu = 0, memory = 0, nodeports = 0, gpu } = usedData;

          request.cpu -= cpu / 1000;
          request.memory -= memory / 1024;
          request.nodeports -= nodeports;
          request.gpu -= gpu?.type ? gpu.amount : 0;
        }

        const overLimitTip: { [key: string]: string } = {
          cpu: 'cpu_exceeds_quota',
          memory: 'memory_exceeds_quota',
          nodeports: 'nodeports_exceeds_quota',
          gpu: 'gpu_exceeds_quota'
        };

        const exceedQuota = quote.find((item) => {
          if (item.used + request[item.type] > item.limit) {
            return true;
          }
        });

        return exceedQuota?.type ? overLimitTip[exceedQuota.type] : undefined;
      }
    }))
  )
);
