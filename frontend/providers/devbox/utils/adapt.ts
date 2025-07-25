import dayjs from 'dayjs';

import {
  devboxReleaseStatusMap,
  devboxStatusMap,
  PodStatusEnum,
  podStatusMap
} from '@/constants/devbox';
import { GetDevboxByNameReturn } from '@/types/adapt';
import { DBListItemType, KbPgClusterType } from '@/types/cluster';
import {
  DevboxDetailTypeV2,
  DevboxListItemType,
  DevboxListItemTypeV2,
  DevboxVersionListItemType,
  PodDetailType
} from '@/types/devbox';

import { AppListItemType } from '@/types/app';
import { IngressListItemType } from '@/types/ingress';
import { V1Deployment, V1Ingress, V1Pod, V1StatefulSet } from '@kubernetes/client-node';

import { KBDevboxReleaseType, KBDevboxType, KBDevboxTypeV2 } from '@/types/k8s';
import { calculateUptime, cpuFormatToM, formatPodTime, memoryFormatToMi } from '@/utils/tools';
import { gpuNodeSelectorKey, gpuResourceKey } from '../constants/devbox';

export const adaptDevboxListItem = (devbox: KBDevboxType): DevboxListItemType => {
  return {
    id: devbox.metadata?.uid || ``,
    name: devbox.metadata.name || 'devbox',
    runtimeType: devbox.spec.runtimeType || '',
    runtimeVersion: devbox.spec.runtimeRef.name || '',
    status:
      devbox.status.phase && devboxStatusMap[devbox.status.phase]
        ? devboxStatusMap[devbox.status.phase]
        : devboxStatusMap.Pending,
    sshPort: devbox.status.network.nodePort,
    createTime: dayjs(devbox.metadata.creationTimestamp).format('YYYY/MM/DD HH:mm'),
    cpu: cpuFormatToM(devbox.spec.resource.cpu),
    memory: memoryFormatToMi(devbox.spec.resource.memory),
    usedCpu: {
      name: '',
      xData: new Array(30).fill(0),
      yData: new Array(30).fill('0')
    },
    usedMemory: {
      name: '',
      xData: new Array(30).fill(0),
      yData: new Array(30).fill('0')
    },
    lastTerminatedReason:
      devbox.status.lastState?.terminated && devbox.status.lastState.terminated.reason === 'Error'
        ? devbox.status.state.waiting
          ? devbox.status.state.waiting.reason
          : devbox.status.state.terminated
            ? devbox.status.state.terminated.reason
            : ''
        : ''
  };
};
export const adaptDevboxListItemV2 = ([devbox, template]: [
  KBDevboxTypeV2,
  {
    templateRepository: {
      iconId: string | null;
    };
    uid: string;
    name: string;
  }
]): DevboxListItemTypeV2 => {
  return {
    id: devbox.metadata?.uid || ``,
    name: devbox.metadata.name || 'devbox',
    template,
    status:
      devbox.status?.phase && devboxStatusMap[devbox.status.phase]
        ? devboxStatusMap[devbox.status.phase]
        : devboxStatusMap.Pending,
    sshPort: devbox.status?.network.nodePort || 65535,
    createTime: devbox.metadata.creationTimestamp,
    cpu: cpuFormatToM(devbox.spec.resource.cpu),
    memory: memoryFormatToMi(devbox.spec.resource.memory),
    usedCpu: {
      name: '',
      xData: new Array(30).fill(0),
      yData: new Array(30).fill('0')
    },
    usedMemory: {
      name: '',
      xData: new Array(30).fill(0),
      yData: new Array(30).fill('0')
    },
    lastTerminatedReason: devbox.status
      ? devbox.status.lastState?.terminated && devbox.status.lastState.terminated.reason === 'Error'
        ? devbox.status.state.waiting
          ? devbox.status.state.waiting.reason
          : devbox.status.state.terminated
            ? devbox.status.state.terminated.reason
            : ''
        : ''
      : ''
  };
};

export const adaptDevboxDetailV2 = ([
  devbox,
  portInfos,
  template
]: GetDevboxByNameReturn): DevboxDetailTypeV2 => {
  const status =
    devbox.status?.phase && devboxStatusMap[devbox.status.phase]
      ? devboxStatusMap[devbox.status.phase]
      : devboxStatusMap.Pending;
  return {
    id: devbox.metadata?.uid || ``,
    name: devbox.metadata.name || 'devbox',
    templateUid: devbox.spec.templateID,
    templateName: template.name,
    templateRepositoryName: template.templateRepository.name,
    templateRepositoryUid: template.templateRepository.uid,
    templateRepositoryDescription: template.templateRepository.description || '',
    templateConfig: JSON.stringify(devbox.spec.config),
    image: template.image,
    iconId: template.templateRepository.iconId || '',
    status,
    sshPort: devbox.status?.network.nodePort || 65535,
    isPause: devbox.status?.phase === 'Stopped',
    createTime: devbox.metadata.creationTimestamp,
    cpu: cpuFormatToM(devbox.spec.resource.cpu),
    memory: memoryFormatToMi(devbox.spec.resource.memory),
    gpu: {
      type: devbox.spec.nodeSelector?.[gpuNodeSelectorKey] || '',
      amount: Number(devbox.spec.resource[gpuResourceKey] || 1),
      manufacturers: 'nvidia'
    },
    usedCpu: {
      name: '',
      xData: new Array(30).fill(0),
      yData: new Array(30).fill('0')
    },
    usedMemory: {
      name: '',
      xData: new Array(30).fill(0),
      yData: new Array(30).fill('0')
    },
    networks: portInfos || [],
    lastTerminatedReason: devbox.status
      ? devbox.status.lastState?.terminated && devbox.status.lastState.terminated.reason === 'Error'
        ? devbox.status.state.waiting
          ? devbox.status.state.waiting.reason
          : devbox.status.state.terminated
            ? devbox.status.state.terminated.reason
            : ''
        : ''
      : ''
  };
};
export const adaptDevboxVersionListItem = (
  devboxRelease: KBDevboxReleaseType
): DevboxVersionListItemType => {
  return {
    id: devboxRelease.metadata?.uid || '',
    name: devboxRelease.metadata.name || 'devbox-release-default',
    devboxName: devboxRelease.spec.devboxName || 'devbox',
    createTime: devboxRelease.metadata.creationTimestamp,
    tag: devboxRelease.spec.newTag || 'v1.0.0',
    status:
      devboxRelease?.status?.phase && devboxReleaseStatusMap[devboxRelease.status.phase]
        ? devboxReleaseStatusMap[devboxRelease.status.phase]
        : devboxReleaseStatusMap.Pending,
    description: devboxRelease.spec.notes || 'release notes'
  };
};

export const adaptPod = (pod: V1Pod): PodDetailType => {
  return {
    ...pod,
    podName: pod.metadata?.name || 'pod name',
    upTime: calculateUptime(pod.metadata?.creationTimestamp || new Date()),
    status: (() => {
      const container = pod.status?.containerStatuses || [];
      if (container.length > 0) {
        const stateObj = container[0].state;
        if (stateObj) {
          const stateKeys = Object.keys(stateObj);
          const key = stateKeys[0] as `${PodStatusEnum}`;
          if (key === PodStatusEnum.running) {
            return podStatusMap[PodStatusEnum.running];
          }
          if (key && podStatusMap[key]) {
            return {
              ...podStatusMap[key],
              ...stateObj[key]
            };
          }
        }
      }
      return podStatusMap.waiting;
    })(),
    containerStatus: (() => {
      const container = pod.status?.containerStatuses || [];
      if (container.length > 0) {
        const lastStateObj = container[0].lastState;
        if (lastStateObj) {
          const lastStateKeys = Object.keys(lastStateObj);
          const key = lastStateKeys[0] as `${PodStatusEnum}`;
          if (key && podStatusMap[key]) {
            return {
              ...podStatusMap[key],
              ...lastStateObj[key]
            };
          }
        }
      }
      return podStatusMap.waiting;
    })(),
    nodeName: pod.spec?.nodeName || 'node name',
    ip: pod.status?.podIP || 'pod ip',
    restarts: pod.status?.containerStatuses ? pod.status?.containerStatuses[0].restartCount : 0,
    age: formatPodTime(pod.metadata?.creationTimestamp),
    usedCpu: {
      name: '',
      xData: new Array(30).fill(0),
      yData: new Array(30).fill('0')
    },
    usedMemory: {
      name: '',
      xData: new Array(30).fill(0),
      yData: new Array(30).fill('0')
    },
    cpu: cpuFormatToM(pod.spec?.containers?.[0]?.resources?.limits?.cpu || '0'),
    memory: memoryFormatToMi(pod.spec?.containers?.[0]?.resources?.limits?.memory || '0')
  };
};

export const adaptDBListItem = (db: KbPgClusterType): DBListItemType => {
  return {
    id: db.metadata?.uid || ``,
    name: db.metadata?.name || 'db name',
    dbType: db?.metadata?.labels['clusterdefinition.kubeblocks.io/name'] || 'postgresql',
    createTime: dayjs(db.metadata?.creationTimestamp).format('YYYY/MM/DD HH:mm'),
    cpu: cpuFormatToM(db.spec?.componentSpecs?.[0]?.resources?.limits?.cpu),
    memory: cpuFormatToM(db.spec?.componentSpecs?.[0]?.resources?.limits?.memory),
    storage:
      db.spec?.componentSpecs?.[0]?.volumeClaimTemplates?.[0]?.spec?.resources?.requests?.storage ||
      '-'
  };
};

export const adaptIngressListItem = (ingress: V1Ingress): IngressListItemType => {
  const firstRule = ingress.spec?.rules?.[0];
  const firstPath = firstRule?.http?.paths?.[0];
  const protocol = ingress.metadata?.annotations?.['nginx.ingress.kubernetes.io/backend-protocol'];
  return {
    name: ingress.metadata?.name || '',
    namespace: ingress.metadata?.namespace || '',
    address: firstRule?.host || '',
    port: firstPath?.backend?.service?.port?.number || 0,
    protocol: protocol || 'http'
  };
};

export const adaptAppListItem = (app: V1Deployment & V1StatefulSet): AppListItemType => {
  return {
    id: app.metadata?.uid || ``,
    name: app.metadata?.name || 'app name',
    createTime: dayjs(app.metadata?.creationTimestamp).format('YYYY/MM/DD HH:mm'),
    imageName:
      app?.metadata?.annotations?.originImageName ||
      app.spec?.template?.spec?.containers?.[0]?.image ||
      ''
  };
};
