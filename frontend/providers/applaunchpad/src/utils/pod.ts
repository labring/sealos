import type { V1Pod } from '@kubernetes/client-node';

export const getPodContainerName = (pod: Pick<V1Pod, 'spec' | 'status'>): string =>
  pod.spec?.containers?.[0]?.name || pod.status?.containerStatuses?.[0]?.name || '';
