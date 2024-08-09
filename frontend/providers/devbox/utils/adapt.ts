import dayjs from 'dayjs'

import { cpuFormatToM } from '@/utils/tools'
import { KbPgClusterType } from '@/types/cluster'
import { DevboxListItemType } from '@/types/devbox'
import { devboxStatusMap } from '@/constants/devbox'

export const adaptDevboxListItem = (devbox: KbPgClusterType): DevboxListItemType => {
  return {
    id: devbox.metadata?.uid || ``,
    name: devbox.metadata?.name || 'db name',
    dbType: devbox?.metadata?.labels['clusterdefinition.kubeblocks.io/name'] || 'postgresql',
    status:
      devbox?.status?.phase && devboxStatusMap[devbox?.status?.phase]
        ? devboxStatusMap[devbox?.status?.phase]
        : devboxStatusMap.UnKnow,
    createTime: dayjs(devbox.metadata?.creationTimestamp).format('YYYY/MM/DD HH:mm'),
    cpu: cpuFormatToM(devbox.spec?.componentSpecs?.[0]?.resources?.limits?.cpu),
    memory: cpuFormatToM(devbox.spec?.componentSpecs?.[0]?.resources?.limits?.memory),
    storage:
      devbox.spec?.componentSpecs?.[0]?.volumeClaimTemplates?.[0]?.spec?.resources?.requests
        ?.storage || '-',
    conditions: devbox?.status?.conditions || [],
    labels: devbox.metadata.labels || {}
  }
}
