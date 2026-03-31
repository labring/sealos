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
  DevboxListItemTypeV2,
  DevboxVersionListItemType,
  PodDetailType
} from '@/types/devbox';

import { AppListItemType } from '@/types/app';
import { IngressListItemType } from '@/types/ingress';
import { V1Deployment, V1Ingress, V1Pod, V1StatefulSet } from '@kubernetes/client-node';

import { KBDevboxReleaseType, KBDevboxTypeV2 } from '@/types/k8s';
import { calculateUptime, formatPodTime } from '@/utils/tools';
import { devboxRemarkKey, gpuNodeSelectorKey, gpuResourceKey } from '../constants/devbox';
import { cpuFormatToM, memoryFormatToMi } from '@sealos/shared';

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
  const gpuType = devbox.spec.nodeSelector?.[gpuNodeSelectorKey];
  const gpuAmount = devbox.spec.resource[gpuResourceKey];

  return {
    id: devbox.metadata?.uid || ``,
    name: devbox.metadata.name || 'devbox',
    template,
    remark: devbox.metadata?.annotations?.[devboxRemarkKey] || '',
    status: devboxStatusMap[devbox.status.phase] || devboxStatusMap.Error, // use devbox.status.phase to get status
    state: devbox.spec.state || 'Error',
    sshPort:
      devbox.spec.network.type === 'SSHGate' ? 2233 : devbox.status?.network.nodePort || 65535,
    createTime: devbox.metadata.creationTimestamp,
    cpu: cpuFormatToM(devbox.spec.resource.cpu),
    memory: memoryFormatToMi(devbox.spec.resource.memory),
    gpu:
      gpuType || gpuAmount
        ? {
            type: gpuType || '',
            amount: Number(gpuAmount || 0),
            manufacturers: 'nvidia'
          }
        : undefined,
    networkType: devbox.spec.network.type
  };
};

export const adaptDevboxDetailV2 = ([
  devbox,
  portInfos,
  template,
  k8sConfigMaps,
  k8sPvcs
]: GetDevboxByNameReturn): DevboxDetailTypeV2 => {
  const status =
    devbox.status?.phase && devboxStatusMap[devbox.status.phase]
      ? devboxStatusMap[devbox.status.phase]
      : devboxStatusMap.Pending;

  const config = devbox.spec.config as any;
  const devboxName = devbox.metadata.name || 'devbox';

  const envs: Array<{ key: string; value: string }> = [];
  if (config?.env && Array.isArray(config.env)) {
    config.env.forEach((item: any) => {
      if (item.name && item.value !== undefined) {
        envs.push({
          key: item.name,
          value: item.value
        });
      }
    });
  }

  const configMaps: Array<{ id: string; path: string; content: string }> = [];
  const volumes: Array<{ id: string; path: string; size: number }> = [];

  if (config?.volumes && config?.volumeMounts) {
    const volumesArray = config.volumes as any[];
    const volumeMountsArray = config.volumeMounts as any[];

    volumesArray.forEach((volume: any) => {
      const volumeMount = volumeMountsArray.find((vm: any) => vm.name === volume.name);
      if (!volumeMount) return;

      if (volume.configMap) {
        const configMapName = volume.configMap.name;
        const match = configMapName.match(new RegExp(`${devboxName}-cm-(.+)`));
        const id = match ? match[1] : '';

        const k8sConfigMap = k8sConfigMaps.find((cm) => cm.metadata?.name === configMapName);
        const content = k8sConfigMap?.data ? Object.values(k8sConfigMap.data)[0] || '' : '';

        configMaps.push({
          id,
          path: volumeMount.mountPath,
          content
        });
      } else if (volume.persistentVolumeClaim) {
        const pvcName = volume.persistentVolumeClaim.claimName;
        const match = pvcName.match(new RegExp(`${devboxName}-pvc-(.+)`));
        const id = match ? match[1] : '';

        const k8sPvc = k8sPvcs.find((pvc) => pvc.metadata?.name === pvcName);
        const sizeStr = k8sPvc?.spec?.resources?.requests?.storage || '1Gi';
        const size = parseInt(sizeStr.replace(/Gi/i, '')) || 1;

        volumes.push({
          id,
          path: volumeMount.mountPath,
          size
        });
      }
    });
  }

  return {
    id: devbox.metadata?.uid || ``,
    name: devboxName,
    templateUid: devbox.spec.templateID,
    templateName: template.name,
    templateRepositoryName: template.templateRepository.name,
    templateRepositoryUid: template.templateRepository.uid,
    templateRepositoryDescription: template.templateRepository.description || '',
    templateConfig: JSON.stringify(devbox.spec.config),
    image: template.image,
    iconId: template.templateRepository.iconId || '',
    status: devboxStatusMap[devbox.status.phase] || devboxStatusMap.Error,
    state: devbox.spec.state || 'Error',
    sshPort:
      devbox.spec.network.type === 'SSHGate' ? 2233 : devbox.status?.network.nodePort || 65535,
    isPause: devbox.status.phase === 'Stopped' || devbox.status.phase === 'Shutdown',
    createTime: devbox.metadata.creationTimestamp,
    cpu: cpuFormatToM(devbox.spec.resource.cpu),
    memory: memoryFormatToMi(devbox.spec.resource.memory),
    gpu: {
      type: devbox.spec.nodeSelector?.[gpuNodeSelectorKey] || '',
      amount: Number(devbox.spec.resource[gpuResourceKey] || 0),
      manufacturers: 'nvidia'
    },
    networks: portInfos || [],
    envs,
    configMaps,
    volumes,
    networkType: devbox.spec.network.type
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
    tag: devboxRelease.spec.version || 'v1.0.0',
    startDevboxAfterRelease: devboxRelease.spec.startDevboxAfterRelease,
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
