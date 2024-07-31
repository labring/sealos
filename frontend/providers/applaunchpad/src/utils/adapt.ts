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
  V2HorizontalPodAutoscaler
} from '@kubernetes/client-node';
import dayjs from 'dayjs';
import yaml from 'js-yaml';
import type {
  AppListItemType,
  PodDetailType,
  AppDetailType,
  PodMetrics,
  PodEvent,
  HpaTarget,
  ProtocolType
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
  gpuResourceKey
} from '@/constants/app';
import {
  cpuFormatToM,
  memoryFormatToMi,
  formatPodTime,
  atobSecretYaml,
  printMemory
} from '@/utils/tools';
import type { DeployKindsType, AppEditType } from '@/types/app';
import { defaultEditVal } from '@/constants/editApp';
import { customAlphabet } from 'nanoid';
import { SEALOS_DOMAIN } from '@/store/static';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

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
    labels: app.metadata?.labels || {}
  };
};

export const adaptPod = (pod: V1Pod): PodDetailType => {
  return {
    ...pod,
    podName: pod.metadata?.name || 'pod name',
    // @ts-ignore
    status: (() => {
      const container = pod.status?.containerStatuses || [];
      if (container.length > 0) {
        const stateObj = container[0].state;
        const lasteStateObj = container[0].lastState;
        if (stateObj) {
          const stateKeys = Object.keys(stateObj);
          const key = stateKeys?.[0] as `${PodStatusEnum}`;
          if (key === PodStatusEnum.running) {
            return podStatusMap[PodStatusEnum.running];
          }
          if (key && podStatusMap[key]) {
            const lastStateReason =
              lasteStateObj && lasteStateObj[key] ? lasteStateObj[key]?.reason : '';
            return {
              lastStateReason,
              ...podStatusMap[key],
              ...stateObj[key]
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

export const adaptAppDetail = (configs: DeployKindsType[]): AppDetailType => {
  const deployKindsMap: {
    [YamlKindEnum.StatefulSet]?: V1StatefulSet;
    [YamlKindEnum.Deployment]?: V1Deployment;
    [YamlKindEnum.Service]?: V1Service;
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

  if (!appDeploy) {
    throw new Error('获取APP异常');
  }

  const useGpu = !!Number(
    appDeploy.spec?.template?.spec?.containers?.[0]?.resources?.limits?.[gpuResourceKey]
  );
  const gpuNodeSelector = useGpu ? appDeploy?.spec?.template?.spec?.nodeSelector : null;

  return {
    labels: appDeploy?.metadata?.labels || {},
    crYamlList: configs,
    id: appDeploy.metadata?.uid || ``,
    appName: appDeploy.metadata?.name || 'app Name',
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
      deployKindsMap.Service?.spec?.ports?.map((item) => {
        const ingress = configs.find(
          (config: any) =>
            config.kind === YamlKindEnum.Ingress &&
            config?.spec?.rules?.[0]?.http?.paths?.[0]?.backend?.service?.port?.number === item.port
        ) as V1Ingress;
        const domain = ingress?.spec?.rules?.[0].host || '';

        const backendProtocol = ingress?.metadata?.annotations?.[
          'nginx.ingress.kubernetes.io/backend-protocol'
        ] as ProtocolType;

        const protocol =
          backendProtocol ?? (item.protocol === 'TCP' ? 'HTTP' : (item.protocol as ProtocolType));

        return {
          networkName: ingress?.metadata?.name || '',
          portName: item.name || '',
          port: item.port,
          protocol: protocol,
          openPublicDomain: !!ingress,
          ...(domain.endsWith(SEALOS_DOMAIN)
            ? {
                publicDomain: domain.split('.')[0],
                customDomain: ''
              }
            : {
                publicDomain: ingress?.metadata?.labels?.[publicDomainKey] || '',
                customDomain: domain
              })
        };
      }) || [],
    hpa: deployKindsMap.HorizontalPodAutoscaler?.spec
      ? {
          use: true,
          target:
            (deployKindsMap.HorizontalPodAutoscaler.spec.metrics?.[0]?.resource
              ?.name as HpaTarget) || 'cpu',
          value: deployKindsMap.HorizontalPodAutoscaler.spec.metrics?.[0]?.resource?.target
            ?.averageUtilization
            ? deployKindsMap.HorizontalPodAutoscaler.spec.metrics[0].resource.target
                .averageUtilization / 10
            : 50,
          minReplicas: deployKindsMap.HorizontalPodAutoscaler.spec.minReplicas || 3,
          maxReplicas: deployKindsMap.HorizontalPodAutoscaler.spec.maxReplicas || 10
        }
      : defaultEditVal.hpa,
    configMapList: deployKindsMap.ConfigMap?.data
      ? Object.entries(deployKindsMap.ConfigMap.data).map(([key, value], i) => ({
          mountPath:
            appDeploy?.spec?.template.spec?.containers[0].volumeMounts?.find(
              (item) => item.name === key
            )?.mountPath || key,
          value
        }))
      : [],
    secret: atobSecretYaml(deployKindsMap?.Secret?.data?.['.dockerconfigjson']),
    storeList: deployKindsMap.StatefulSet?.spec?.volumeClaimTemplates
      ? deployKindsMap.StatefulSet?.spec?.volumeClaimTemplates.map((item) => ({
          name: item.metadata?.name || '',
          path: item.metadata?.annotations?.path || '',
          value: Number(item.metadata?.annotations?.value || 0)
        }))
      : []
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
    'gpu'
  ];
  const res: Record<string, any> = {};

  keys.forEach((key) => {
    res[key] = app[key];
  });
  return res as AppEditType;
};

// yaml file adapt to edit form
export const adaptYamlToEdit = (yamlList: string[]) => {
  const configs = yamlList.map((item) => yaml.loadAll(item) as DeployKindsType).flat();

  const deployKindsMap: {
    [YamlKindEnum.Deployment]?: V1Deployment;
    [YamlKindEnum.Service]?: V1Service;
    [YamlKindEnum.ConfigMap]?: V1ConfigMap;
    [YamlKindEnum.Ingress]?: V1Ingress;
    [YamlKindEnum.HorizontalPodAutoscaler]?: V2HorizontalPodAutoscaler;
    [YamlKindEnum.Secret]?: V1Secret;
  } = {};

  configs.forEach((item) => {
    if (item.kind) {
      // @ts-ignore
      deployKindsMap[item.kind] = item;
    }
  });

  const domain = deployKindsMap?.Ingress?.spec?.rules?.[0].host;
  const cpuStr =
    deployKindsMap?.Deployment?.spec?.template?.spec?.containers?.[0]?.resources?.requests?.cpu;
  const memoryStr =
    deployKindsMap?.Deployment?.spec?.template?.spec?.containers?.[0]?.resources?.requests?.memory;

  const res: Record<string, any> = {
    imageName: deployKindsMap?.Deployment?.spec?.template?.spec?.containers?.[0]?.image,
    runCMD:
      deployKindsMap?.Deployment?.spec?.template?.spec?.containers?.[0]?.command?.join(' ') || '',
    cmdParam:
      deployKindsMap?.Deployment?.spec?.template?.spec?.containers?.[0]?.args?.join(' ') || '',
    replicas: deployKindsMap?.Deployment?.spec?.replicas,
    cpu: cpuStr ? cpuFormatToM(cpuStr) : undefined,
    memory: memoryStr ? memoryFormatToMi(memoryStr) : undefined,
    accessExternal: deployKindsMap?.Ingress
      ? {
          use: true,
          outDomain: domain?.split('.')[0],
          selfDomain: domain
        }
      : undefined,
    containerOutPort:
      deployKindsMap?.Deployment?.spec?.template?.spec?.containers?.[0]?.ports?.[0]?.containerPort,
    envs:
      deployKindsMap?.Deployment?.spec?.template?.spec?.containers?.[0]?.env?.map((env) => ({
        key: env.name,
        value: env.value
      })) || undefined,
    hpa: deployKindsMap.HorizontalPodAutoscaler?.spec
      ? {
          use: true,
          target:
            (deployKindsMap.HorizontalPodAutoscaler.spec.metrics?.[0]?.resource
              ?.name as HpaTarget) || 'cpu',
          value:
            deployKindsMap.HorizontalPodAutoscaler.spec.metrics?.[0]?.resource?.target
              ?.averageUtilization || 50,
          minReplicas: deployKindsMap.HorizontalPodAutoscaler.spec?.maxReplicas,
          maxReplicas: deployKindsMap.HorizontalPodAutoscaler.spec?.minReplicas
        }
      : undefined,
    configMapList: deployKindsMap?.ConfigMap?.data
      ? Object.entries(deployKindsMap?.ConfigMap.data).map(([key, value]) => ({
          mountPath: key,
          value
        }))
      : undefined,
    secret: deployKindsMap.Secret
      ? {
          ...defaultEditVal.secret,
          use: true
        }
      : undefined
  };

  for (const key in res) {
    if (res[key] === undefined) {
      delete res[key];
    }
  }

  return res;
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
  const newVal = val.map((item) => item * gpuAmount);

  return newVal.map((item) => ({
    label: type === 'memory' ? (item >= 1024 ? `${item / 1024} G` : `${item} M`) : `${item / 1000}`,
    value: item
  }));
};
