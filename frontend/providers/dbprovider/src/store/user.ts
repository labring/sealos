import { getUserQuota } from '@/api/platform';
import { DBEditType } from '@/types/db';
import { I18nCommonKey } from '@/types/i18next';
import { UserQuotaItemType } from '@/types/user';
import {
  calculateDatabaseQuotaDelta,
  checkQuotaAvailability,
  type QuotaRequest
} from '@/utils/quota';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type State = {
  balance: number;
  userQuota: UserQuotaItemType[];
  loadUserQuota: () => Promise<null>;
  checkQuotaAllow: (
    request: DBEditType,
    usedData?: DBEditType
  ) => Promise<I18nCommonKey | undefined>;
  checkQuotaRequest: (request: QuotaRequest) => Promise<I18nCommonKey | undefined>;
};

export const useUserStore = create<State>()(
  devtools(
    immer((set) => ({
      balance: 5,
      userQuota: [],
      loadUserQuota: async () => {
        const response = await getUserQuota();

        set((state) => {
          state.userQuota = response.quota;
        });
        return null;
      },
      checkQuotaAllow: async (request, usedData) =>
        checkQuotaAvailability({
          loadQuota: async () => {
            const response = await getUserQuota();
            set({ userQuota: response.quota });
            return response.quota;
          },
          request: calculateDatabaseQuotaDelta(request, usedData),
          requireHeadroom: usedData ? [] : ['ephemeral-storage']
        }),
      checkQuotaRequest: async (request) =>
        checkQuotaAvailability({
          loadQuota: async () => {
            const response = await getUserQuota();
            set({ userQuota: response.quota });
            return response.quota;
          },
          request
        })
    }))
  )
);
