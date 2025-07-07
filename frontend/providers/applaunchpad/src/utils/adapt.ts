import type {
  V1StatefulSet,
  V1Deployment,
  V1ConfigMap,
  V1Service,
  V1Ingress,
  V1Secret,
  V1Pod,
  SinglePodMetrics,
  CoreV1EventList,
  V2HorizontalPodAutoscaler,
  V1VolumeMount
} from '@kubernetes/client-node';
import dayjs from 'dayjs';
import type {
  AppListItemType,
  PodDetailType,
  AppDetailType,
  PodMetrics,
  PodEvent,
  HpaTarget,
  ApplicationProtocolType,
  TAppSourceType,
  TransportProtocolType,
  DeployKindsType,
  AppEditType
} from '@/types/app';
import {
  appStatusMap,
  podStatusMap,
  pauseKey,
  maxReplicasKey,
  minReplicasKey,
  PodStatusEnum,
  publicDomainKey,
  gpuNodeSelectorKey,
  gpuResourceKey,
  AppSourceConfigs
} from '@/constants/app';
import { cpuFormatToM, memoryFormatToMi, formatPodTime, atobSecretYaml } from '@/utils/tools';
import { defaultEditVal } from '@/constants/editApp';
import { customAlphabet } from 'nanoid';
import { has } from 'lodash';
import type { EnvResponse } from '@/types';
import { lauchpadRemarkKey } from '@/constants/account';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

export const getAppSource = (
  app: V1Deployment | V1StatefulSet
): {
  hasSource: boolean;
  sourceName: string;
  sourceType: TAppSourceType;
} => {
  const labels = app.metadata?.labels || {};

  for (const config of AppSourceConfigs) {
    if (has(labels, config.key)) {
      return {
        hasSource: true,
        sourceName: labels[config.key],
        sourceType: config.type
      };
    }
  }

  return {
    hasSource: false,
    sourceName: '',
    sourceType: 'app_store'
  };
};

export const adaptAppListItem = (app: V1Deployment & V1StatefulSet): AppListItemType => {
  // compute store amount
  const storeAmount = app.spec?.volumeClaimTemplates
    ? app.spec?.volumeClaimTemplates.reduce(
        (sum, item) => sum + Number(item?.metadata?.annotations?.value),
        0
      )
    : 0;

  const gpuNodeSelector = app?.spec?.template?.spec?.nodeSelector;

  return {
    id: app.metadata?.uid || ``,
    name: app.metadata?.name || 'app name',
    status: appStatusMap.waiting,
    isPause: !!app?.metadata?.annotations?.[pauseKey],
    createTime: dayjs(app.metadata?.creationTimestamp).format('YYYY/MM/DD HH:mm'),
    cpu: cpuFormatToM(app.spec?.template?.spec?.containers?.[0]?.resources?.limits?.cpu || '0'),
    memory: memoryFormatToMi(
      app.spec?.template?.spec?.containers?.[0]?.resources?.limits?.memory || '0'
    ),
    gpu: {
      type: gpuNodeSelector?.[gpuNodeSelectorKey] || '',
      amount: Number(
        app.spec?.template?.spec?.containers?.[0]?.resources?.limits?.[gpuResourceKey] || 1
      ),
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
    activeReplicas: app.status?.readyReplicas || 0,
    maxReplicas: +(app.metadata?.annotations?.[maxReplicasKey] || app.status?.readyReplicas || 0),
    minReplicas: +(app.metadata?.annotations?.[minReplicasKey] || app.status?.readyReplicas || 0),
    storeAmount,
    labels: app.metadata?.labels || {},
    source: getAppSource(app),
    kind: app.kind?.toLowerCase() as 'deployment' | 'statefulset',
    remark: app.metadata?.annotations?.[lauchpadRemarkKey]
  };
};

export const adaptPod = (pod: V1Pod): PodDetailType => {
  return {
    ...pod,
    podName: pod.metadata?.name || 'pod name',
    status: (() => {
      const container = pod.status?.containerStatuses || [];
      if (container.length > 0) {
        const stateObj = container[0].state;
        if (stateObj) {
          const status = [
            PodStatusEnum.running,
            PodStatusEnum.terminated,
            PodStatusEnum.waiting
          ].find((s) => stateObj[s]);

          if (status) {
            return status === PodStatusEnum.running
              ? podStatusMap[PodStatusEnum.running]
              : { ...podStatusMap[status], ...stateObj[status] };
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
          const status = [
            PodStatusEnum.running,
            PodStatusEnum.terminated,
            PodStatusEnum.waiting
          ].find((s) => lastStateObj[s]);

          if (status) {
            return status === PodStatusEnum.running
              ? podStatusMap[PodStatusEnum.running]
              : { ...podStatusMap[status], ...lastStateObj[status] };
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

export const adaptMetrics = (metrics: SinglePodMetrics): PodMetrics => {
  return {
    podName: metrics.metadata.name,
    cpu: cpuFormatToM(metrics?.containers?.[0]?.usage?.cpu),
    memory: memoryFormatToMi(metrics?.containers?.[0]?.usage?.memory)
  };
};

export const adaptEvents = (events: CoreV1EventList): PodEvent[] => {
  return events.items
    .sort((a, b) => {
      const lastTimeA = a.lastTimestamp || a.eventTime;
      const lastTimeB = b.lastTimestamp || b.eventTime;

      if (!lastTimeA || !lastTimeB) return 1;
      return new Date(lastTimeB).getTime() - new Date(lastTimeA).getTime();
    })
    .map((item) => ({
      id: item.metadata.uid || `${Date.now()}`,
      reason: item.reason || '',
      message: item.message || '',
      count: item.count || 0,
      type: item.type || 'Warning',
      firstTime: formatPodTime(item.firstTimestamp || item.metadata?.creationTimestamp),
      lastTime: formatPodTime(item.lastTimestamp || item?.eventTime)
    }));
};

export enum YamlKindEnum {
  StatefulSet = 'StatefulSet',
  Deployment = 'Deployment',
  Service = 'Service',
  ConfigMap = 'ConfigMap',
  Ingress = 'Ingress',
  Issuer = 'Issuer',
  Certificate = 'Certificate',
  HorizontalPodAutoscaler = 'HorizontalPodAutoscaler',
  Secret = 'Secret',
  PersistentVolumeClaim = 'PersistentVolumeClaim'
}

// adaptAppDetail function has been moved to server side API call
export const adaptAppDetail = (configs: DeployKindsType[], envs: EnvResponse): AppDetailType => {
  const allServices = configs
    .filter((item) => item.kind === YamlKindEnum.Service)
    .map((item) => item as V1Service);

  const allServicePorts = allServices.flatMap((service) => service.spec?.ports || []);

  const deployKindsMap: {
    [YamlKindEnum.StatefulSet]?: V1StatefulSet;
    [YamlKindEnum.Deployment]?: V1Deployment;
    [YamlKindEnum.ConfigMap]?: V1ConfigMap;
    [YamlKindEnum.HorizontalPodAutoscaler]?: V2HorizontalPodAutoscaler;
    [YamlKindEnum.Secret]?: V1Secret;
  } = {};

  configs.forEach((item) => {
    if (item.kind) {
      // @ts-ignore
      deployKindsMap[item.kind] = item;
    }
  });

  const appDeploy = deployKindsMap.Deployment || deployKindsMap.StatefulSet;

  if (!appDeploy || !appDeploy?.metadata?.name) {
    throw new Error('获取APP异常');
  }

  const appName = appDeploy.metadata?.name;

  const getConfigMapVolumeNames = (): string[] => {
    if (!deployKindsMap.ConfigMap) return [];

    const configMapName = deployKindsMap.ConfigMap.metadata?.name;
    const configMapVolumes =
      appDeploy?.spec?.template?.spec?.volumes?.filter(
        (volume) => volume.configMap?.name === configMapName
      ) || [];

    return configMapVolumes.map((volume) => volume.name).filter(Boolean) as string[];
  };

  const configMapVolumeNames = getConfigMapVolumeNames();

  const getConfigMapList = (): Array<{
    mountPath: string;
    value: string;
    key: string;
    volumeName: string;
  }> => {
    const configMap = deployKindsMap.ConfigMap;
    if (!configMap?.data || !appDeploy) {
      return [];
    }
    const configMapName = configMap.metadata?.name;
    const volumes = appDeploy.spec?.template?.spec?.volumes || [];
    const configMapVolumes = volumes.filter((volume) => volume.configMap?.name === configMapName);
    if (configMapVolumes.length === 0) {
      return [];
    }
    const volumeMounts = appDeploy.spec?.template?.spec?.containers?.[0]?.volumeMounts || [];
    const results: Array<{ mountPath: string; value: string; key: string; volumeName: string }> =
      [];

    configMapVolumes.forEach((volume) => {
      const relatedMounts = volumeMounts.filter((mount) => mount.name === volume.name);

      if (volume.configMap?.items && volume.configMap.items.length > 0) {
        volume.configMap.items.forEach((item) => {
          if (!item.key) return;
          const matchedMount = relatedMounts.find((mount) => mount.subPath === item.path);

          if (matchedMount) {
            const value = configMap.data?.[item.key] || '';
            results.push({
              mountPath: matchedMount.mountPath,
              value: value,
              key: item.key,
              volumeName: volume.name
            });
          }
        });
      } else {
        relatedMounts.forEach((mount) => {
          if (mount.subPath) {
            const configMapKey = mount.subPath;
            const value = configMap?.data?.[configMapKey] || '';

            if (value) {
              results.push({
                mountPath: mount.mountPath,
                value: value,
                key: configMapKey,
                volumeName: volume.name
              });
            }
          }
        });
      }
    });

    return results.filter((item) => item.value);
  };

  const useGpu = !!Number(
    appDeploy.spec?.template?.spec?.containers?.[0]?.resources?.limits?.[gpuResourceKey]
  );
  const gpuNodeSelector = useGpu ? appDeploy?.spec?.template?.spec?.nodeSelector : null;

  const getFilteredVolumeMounts = () => {
    const volumeMounts = appDeploy?.spec?.template?.spec?.containers?.[0]?.volumeMounts || [];
    const storeNames =
      deployKindsMap.StatefulSet?.spec?.volumeClaimTemplates?.map(
        (template) => template.metadata?.name
      ) || [];

    return volumeMounts.filter(
      (mount) => !configMapVolumeNames.includes(mount.name) && !storeNames.includes(mount.name)
    );
  };

  const getFilteredVolumes = () => {
    return (
      appDeploy?.spec?.template?.spec?.volumes?.filter((volume) => {
        if (!deployKindsMap.ConfigMap) return true;
        const configMapName = deployKindsMap.ConfigMap.metadata?.name;
        return !(volume.configMap?.name === configMapName);
      }) || []
    );
  };

  return {
    labels: appDeploy?.metadata?.labels || {},
    crYamlList: configs,
    id: appDeploy.metadata?.uid || ``,
    appName: appName,
    createTime: dayjs(appDeploy.metadata?.creationTimestamp).format('YYYY-MM-DD HH:mm'),
    status: appStatusMap.waiting,
    isPause: !!appDeploy?.metadata?.annotations?.[pauseKey],
    imageName:
      appDeploy?.metadata?.annotations?.originImageName ||
      appDeploy.spec?.template?.spec?.containers?.[0]?.image ||
      '',
    runCMD: appDeploy.spec?.template?.spec?.containers?.[0]?.command?.join(' ') || '',
    cmdParam:
      (appDeploy.spec?.template?.spec?.containers?.[0]?.args?.length === 1
        ? appDeploy.spec?.template?.spec?.containers?.[0]?.args.join(' ')
        : JSON.stringify(appDeploy.spec?.template?.spec?.containers?.[0]?.args)) || '',
    replicas: appDeploy.spec?.replicas || 0,
    cpu: cpuFormatToM(
      appDeploy.spec?.template?.spec?.containers?.[0]?.resources?.limits?.cpu || '0'
    ),
    memory: memoryFormatToMi(
      appDeploy.spec?.template?.spec?.containers?.[0]?.resources?.limits?.memory || '0'
    ),
    gpu: {
      type: gpuNodeSelector?.[gpuNodeSelectorKey] || '',
      amount: Number(
        appDeploy.spec?.template?.spec?.containers?.[0]?.resources?.limits?.[gpuResourceKey] || 1
      ),
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
    envs:
      appDeploy.spec?.template?.spec?.containers?.[0]?.env?.map((env) => {
        return {
          key: env.name,
          value: env.value || '',
          valueFrom: env.valueFrom
        };
      }) || [],
    networks:
      allServicePorts?.map((item) => {
        const service = allServices.find((svc) =>
          svc.spec?.ports?.some((port) => port.port === item.port)
        );
        const ingress = configs.find(
          (config: any) =>
            config.kind === YamlKindEnum.Ingress &&
            config?.spec?.rules?.[0]?.http?.paths?.[0]?.backend?.service?.port?.number === item.port
        ) as V1Ingress;
        const domain = ingress?.spec?.rules?.[0].host || '';

        const appProtocol =
          (ingress?.metadata?.annotations?.[
            'nginx.ingress.kubernetes.io/backend-protocol'
          ] as ApplicationProtocolType) || 'HTTP';

        const protocol = (item?.protocol || 'TCP') as TransportProtocolType;

        const isCustomDomain =
          !domain.endsWith(envs.SEALOS_DOMAIN) &&
          !envs.SEALOS_USER_DOMAINS.some((item) => domain.endsWith(item.name));

        return {
          serviceName: service?.metadata?.name || '',
          networkName: ingress?.metadata?.name || '',
          portName: item.name || '',
          port: item.port,
          nodePort: item?.nodePort,
          openNodePort: !!item?.nodePort,
          protocol: protocol,
          appProtocol: appProtocol,
          openPublicDomain: !!ingress,
          publicDomain: isCustomDomain
            ? ingress?.metadata?.labels?.[publicDomainKey] || ''
            : domain.split('.')[0],
          customDomain: isCustomDomain ? domain : '',
          domain: isCustomDomain
            ? envs.SEALOS_DOMAIN
            : item?.nodePort
            ? domain
            : domain.split('.').slice(1).join('.') || envs.SEALOS_DOMAIN
        };
      }) || [],
    hpa: deployKindsMap.HorizontalPodAutoscaler?.spec
      ? {
          use: true,
          target:
            deployKindsMap.HorizontalPodAutoscaler.spec.metrics?.[0]?.pods?.metric?.name ===
            'DCGM_FI_DEV_GPU_UTIL'
              ? 'gpu'
              : (deployKindsMap.HorizontalPodAutoscaler.spec.metrics?.[0]?.resource
                  ?.name as HpaTarget) || 'cpu',
          value: (() => {
            const metrics = deployKindsMap.HorizontalPodAutoscaler.spec.metrics?.[0];
            if (metrics?.pods?.metric?.name === 'DCGM_FI_DEV_GPU_UTIL') {
              return Number(metrics.pods.target?.averageValue) || 50;
            }
            return metrics?.resource?.target?.averageUtilization
              ? metrics.resource.target.averageUtilization / 10
              : 50;
          })(),
          minReplicas: deployKindsMap.HorizontalPodAutoscaler.spec.minReplicas || 3,
          maxReplicas: deployKindsMap.HorizontalPodAutoscaler.spec.maxReplicas || 10
        }
      : defaultEditVal.hpa,
    configMapList: getConfigMapList(),
    secret: atobSecretYaml(deployKindsMap?.Secret?.data?.['.dockerconfigjson']),
    storeList: deployKindsMap.StatefulSet?.spec?.volumeClaimTemplates
      ? deployKindsMap.StatefulSet?.spec?.volumeClaimTemplates.map((item) => ({
          name: item.metadata?.name || '',
          path: item.metadata?.annotations?.path || '',
          value: Number(item.metadata?.annotations?.value || 0)
        }))
      : [],
    volumeMounts: getFilteredVolumeMounts(),
    volumes: getFilteredVolumes(),
    kind: appDeploy?.kind?.toLowerCase() as 'deployment' | 'statefulset',
    source: getAppSource(appDeploy)
  };
};

export const adaptEditAppData = (app: AppDetailType): AppEditType => {
  const keys: (keyof AppEditType)[] = [
    'appName',
    'imageName',
    'runCMD',
    'cmdParam',
    'replicas',
    'cpu',
    'memory',
    'networks',
    'envs',
    'hpa',
    'configMapList',
    'secret',
    'storeList',
    'gpu',
    'labels',
    'kind',
    'volumes',
    'volumeMounts'
  ];

  const res: Record<string, any> = {};

  keys.forEach((key) => {
    res[key] = app[key];
  });
  return res as AppEditType;
};

export const sliderNumber2MarkList = ({
  val,
  type,
  gpuAmount = 1
}: {
  val: number[];
  type: 'cpu' | 'memory';
  gpuAmount?: number;
}) => {
  const newVal = val.map((item) => item);

  return newVal.map((item) => ({
    label: type === 'memory' ? (item >= 1024 ? `${item / 1024} G` : `${item} M`) : `${item / 1000}`,
    value: item
  }));
};
