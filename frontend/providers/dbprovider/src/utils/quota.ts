import type { DBEditType } from '@/types/db';
import type { I18nCommonKey } from '@/types/i18next';
import type { UserQuotaItemType } from '@/types/user';
import { distributeResources } from './database';

export type QuotaRequest = Partial<Record<UserQuotaItemType['type'], number>>;

const quotaTipMap: Record<UserQuotaItemType['type'], I18nCommonKey> = {
  cpu: 'app.cpu_exceeds_quota',
  memory: 'app.memory_exceeds_quota',
  storage: 'app.storage_exceeds_quota',
  pods: 'app.pods_exceeds_quota',
  nodeports: 'app.nodeports_exceeds_quota',
  'ephemeral-storage': 'app.ephemeral_storage_exceeds_quota'
};

export const calculateDatabaseQuotaRequest = (data: DBEditType): QuotaRequest => {
  const components = distributeResources({ ...data, forDisplay: false });

  return Object.values(components).reduce<
    Required<Pick<QuotaRequest, 'cpu' | 'memory' | 'storage' | 'pods'>>
  >(
    (request, component) => {
      const replicas = Number(component.other?.replicas ?? data.replicas);

      request.cpu += (Number(component.cpuMemory.limits.cpu.replace('m', '')) / 1000) * replicas;
      request.memory +=
        (Number(component.cpuMemory.limits.memory.replace('Mi', '')) / 1024) * replicas;
      request.storage += component.storage * replicas;
      request.pods += replicas;

      return request;
    },
    { cpu: 0, memory: 0, storage: 0, pods: 0 }
  );
};

export const calculateDatabaseQuotaDelta = (
  request: DBEditType,
  usedData?: DBEditType
): QuotaRequest => {
  const requestedQuota = calculateDatabaseQuotaRequest(request);
  if (!usedData) return requestedQuota;

  const usedQuota = calculateDatabaseQuotaRequest(usedData);

  return {
    cpu: (requestedQuota.cpu || 0) - (usedQuota.cpu || 0),
    memory: (requestedQuota.memory || 0) - (usedQuota.memory || 0),
    storage: (requestedQuota.storage || 0) - (usedQuota.storage || 0),
    pods: (requestedQuota.pods || 0) - (usedQuota.pods || 0)
  };
};

export const checkQuotaAvailability = async ({
  loadQuota,
  request,
  requireHeadroom = []
}: {
  loadQuota: () => Promise<UserQuotaItemType[]>;
  request: QuotaRequest;
  requireHeadroom?: UserQuotaItemType['type'][];
}): Promise<I18nCommonKey | undefined> => {
  try {
    const quota = await loadQuota();
    const exceededQuota = quota.find((item) => {
      const requested = request[item.type] || 0;

      if (requireHeadroom.includes(item.type) && item.used >= item.limit) {
        return true;
      }

      return requested > 0 && item.used + requested > item.limit;
    });

    return exceededQuota ? quotaTipMap[exceededQuota.type] : undefined;
  } catch {
    return 'app.quota_check_failed';
  }
};
