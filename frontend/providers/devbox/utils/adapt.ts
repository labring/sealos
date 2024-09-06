import dayjs from 'dayjs'

import { devboxStatusMap } from '@/constants/devbox'
import { cpuFormatToM, memoryFormatToMi } from '@/utils/tools'
import { KBDevboxType, KBDevboxReleaseType } from '@/types/k8s'
import { DevboxListItemType, DevboxVersionListItemType } from '@/types/devbox'

export const adaptDevboxListItem = (devbox: KBDevboxType): DevboxListItemType => {
  return {
    id: devbox.metadata?.uid || ``,
    name: devbox.metadata.name || 'devbox',
    runtimeType: devbox.spec.runtimeType || '',
    runtimeVersion: devbox.spec.runtimeVersion || '',
    status:
      devbox.spec.state && devboxStatusMap[devbox.spec.state]
        ? devboxStatusMap[devbox.spec.state]
        : devboxStatusMap.UnKnow,
    sshPort: devbox.status.network.nodePort,
    createTime: dayjs(devbox.metadata.creationTimestamp).format('YYYY/MM/DD HH:mm'),
    cpu: cpuFormatToM(devbox.spec.resource.cpu),
    memory: memoryFormatToMi(devbox.spec.resource.memory),
    usedCpu: {
      // TODO: 这里需要处理一下
      name: 'usedCpu',
      xData: [
        1691583720000, // '2024-08-09 12:02'
        1691583780000, // '2024-08-09 12:03'
        1691583840000, // '2024-08-09 12:04'
        1691583900000, // '2024-08-09 12:05'
        1691583960000 // '2024-08-09 12:06'
      ],
      yData: ['0.1', '0.2', '0.3', '0.4', '0.5']
    },
    usedMemory: {
      name: 'usedMemory',
      xData: [
        1691583720000, // '2024-08-09 12:02'
        1691583780000, // '2024-08-09 12:03'
        1691583840000, // '2024-08-09 12:04'
        1691583900000, // '2024-08-09 12:05'
        1691583960000 // '2024-08-09 12:06'
      ],
      yData: ['0.1', '0.2', '0.3', '0.4', '0.5']
    },
    networks: devbox.portInfos || []
  }
}

export const adaptDevboxVersionListItem = (
  devboxRelease: KBDevboxReleaseType
): DevboxVersionListItemType => {
  return {
    id: devboxRelease.metadata?.uid || '',
    name: devboxRelease.metadata.name || 'devbox-release-default',
    devboxName: devboxRelease.spec.devboxName || 'devbox',
    createTime: dayjs(devboxRelease.metadata.creationTimestamp).format('YYYY/MM/DD HH:mm'),
    tag: devboxRelease.spec.newTag || 'v1.0.0',
    description: devboxRelease.spec.notes || 'release notes'
  }
}
