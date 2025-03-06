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
  AppEditContainerType
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
  stopKey,
  priorityKey,
  modelNameKey
} from '@/constants/app';
import {
  cpuFormatToM,
  memoryFormatToMi,
  formatPodTime,
  atobSecretYaml,
  printMemory,
  parseImageName
} from '@/utils/tools';
import type { DeployKindsType, AppEditType } from '@/types/app';
import { defaultEditVal } from '@/constants/editApp';
import { customAlphabet } from 'nanoid';
import { SEALOS_DOMAIN } from '@/store/static';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

export const sortAppListByTime = (apps: AppListItemType[]): AppListItemType[] => {
  return apps.sort((a, b) => {
    const timeA = dayjs(a.createTime, 'YYYY/MM/DD HH:mm');
    const timeB = dayjs(b.createTime, 'YYYY/MM/DD HH:mm');
    return timeB.valueOf() - timeA.valueOf(); // 降序排列,最新的在前
  });
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
    isStop: !!app?.metadata?.annotations?.[stopKey],
    priority: app.metadata?.labels?.[priorityKey] || '1',
    modelName: app.metadata?.annotations?.[modelNameKey] || '',
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
    storeAmount
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
  const allServicePorts = configs.flatMap((item) => {
    if (item.kind === YamlKindEnum.Service) {
      const temp = item as V1Service;
      return temp.spec?.ports || [];
    } else {
      return [];
    }
  });

  const deployKindsMap: {
    [YamlKindEnum.StatefulSet]?: V1StatefulSet;
    [YamlKindEnum.Deployment]?: V1Deployment;
    // [YamlKindEnum.Service]?: V1Service;
    [YamlKindEnum.ConfigMap]?: V1ConfigMap;
    [YamlKindEnum.HorizontalPodAutoscaler]?: V2HorizontalPodAutoscaler;
    [YamlKindEnum.Secret]?: V1Secret;
  } = {};

  configs.forEach((item) => {
    if (item.kind !== YamlKindEnum.Service) {
      // @ts-ignore
      deployKindsMap[item.kind] = item;
    }
  });

  const appDeploy = deployKindsMap.Deployment || deployKindsMap.StatefulSet;
  const _containers = appDeploy?.spec?.template.spec?.containers;

  if (!appDeploy || !_containers) {
    throw new Error('获取APP异常');
  }

  const useGpu = !!Number(
    appDeploy.spec?.template?.spec?.containers?.[0]?.resources?.limits?.[gpuResourceKey]
  );
  const gpuNodeSelector = useGpu ? appDeploy?.spec?.template?.spec?.nodeSelector : null;

  const containers = _containers.map((container) => {
    const containerPortNames = container.ports?.map((p) => p.name) || [];
    const matchingServicePorts =
      allServicePorts?.filter((servicePort) => containerPortNames.includes(servicePort.name)) || [];

    const networks =
      matchingServicePorts?.map((item) => {
        const ingress = configs.find(
          (config: any) =>
            config.kind === YamlKindEnum.Ingress &&
            config?.spec?.rules?.[0]?.http?.paths?.[0]?.backend?.service?.port?.number === item.port
        ) as V1Ingress;
        const domain = ingress?.spec?.rules?.[0].host || '';

        return {
          networkName: ingress?.metadata?.name || '',
          portName: item.name || '',
          port: item.port,
          nodePort: item.nodePort,
          protocol:
            (ingress?.metadata?.annotations?.[
              'nginx.ingress.kubernetes.io/backend-protocol'
            ] as AppEditContainerType['networks'][0]['protocol']) || item.protocol === 'TCP'
              ? 'HTTP'
              : (item.protocol as AppEditContainerType['networks'][number]['protocol']),
          openPublicDomain: !!item.nodePort,
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
      }) || [];

    const { repository, tag } = parseImageName(container?.image || '');

    return {
      name: container?.name || '',
      imageName: container?.image || '',
      imageRepo: repository,
      imageTag: tag || 'latest',
      runCMD: container?.command?.join(' ') || '',
      cmdParam:
        (container?.args?.length === 1
          ? container?.args.join(' ')
          : JSON.stringify(container?.args)) || '',
      cpu: cpuFormatToM(container?.resources?.limits?.cpu || '0'),
      memory: memoryFormatToMi(container?.resources?.limits?.memory || '0'),
      envs:
        container?.env?.map((env) => {
          return {
            key: env.name,
            value: env.value || '',
            valueFrom: env.valueFrom
          };
        }) || [],
      networks: networks,
      secret: atobSecretYaml(deployKindsMap?.Secret?.data?.['.dockerconfigjson'])
    };
  });

  return {
    crYamlList: configs,
    id: appDeploy.metadata?.uid || ``,
    appName: appDeploy.metadata?.name || 'app Name',
    modelName: '',
    createTime: dayjs(appDeploy.metadata?.creationTimestamp).format('YYYY-MM-DD HH:mm'),
    status: appStatusMap.waiting,
    isPause: !!appDeploy?.metadata?.annotations?.[pauseKey],
    priority: appDeploy?.metadata?.labels?.[priorityKey] || '1',
    isStop: !!appDeploy?.metadata?.annotations?.[stopKey],
    imageName:
      appDeploy?.metadata?.annotations?.originImageName ||
      appDeploy.spec?.template?.spec?.containers?.[0]?.image ||
      '',
    replicas: appDeploy.spec?.replicas || 0,
    currentContainerName: containers[0].name,
    containers: containers,
    // runCMD: appDeploy.spec?.template?.spec?.containers?.[0]?.command?.join(' ') || '',
    // cmdParam:
    //   (appDeploy.spec?.template?.spec?.containers?.[0]?.args?.length === 1
    //     ? appDeploy.spec?.template?.spec?.containers?.[0]?.args.join(' ')
    //     : JSON.stringify(appDeploy.spec?.template?.spec?.containers?.[0]?.args)) || '',
    // cpu: cpuFormatToM(
    //   appDeploy.spec?.template?.spec?.containers?.[0]?.resources?.limits?.cpu || '0'
    // ),
    // memory: memoryFormatToMi(
    //   appDeploy.spec?.template?.spec?.containers?.[0]?.resources?.limits?.memory || '0'
    // ),
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
    // envs:
    //   appDeploy.spec?.template?.spec?.containers?.[0]?.env?.map((env) => {
    //     return {
    //       key: env.name,
    //       value: env.value || '',
    //       valueFrom: env.valueFrom
    //     };
    //   }) || [],
    // networks:
    //   deployKindsMap.Service?.spec?.ports?.map((item) => {
    //     const ingress = configs.find(
    //       (config: any) =>
    //         config.kind === YamlKindEnum.Ingress &&
    //         config?.spec?.rules?.[0]?.http?.paths?.[0]?.backend?.service?.port?.number === item.port
    //     ) as V1Ingress;
    //     const domain = ingress?.spec?.rules?.[0].host || '';

    //     return {
    //       networkName: ingress?.metadata?.name || '',
    //       portName: item.name || '',
    //       port: item.port,
    //       protocol:
    //         (ingress?.metadata?.annotations?.[
    //           'nginx.ingress.kubernetes.io/backend-protocol'
    //         ] as AppEditType['networks'][0]['protocol']) || 'HTTP',
    //       openPublicDomain: !!ingress,
    //       ...(domain.endsWith(SEALOS_DOMAIN)
    //         ? {
    //             publicDomain: domain.split('.')[0],
    //             customDomain: ''
    //           }
    //         : {
    //             publicDomain: ingress?.metadata?.labels?.[publicDomainKey] || '',
    //             customDomain: domain
    //           })
    //     };
    //   }) || [],
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
    // secret: atobSecretYaml(deployKindsMap?.Secret?.data?.['.dockerconfigjson']),
    storeList: deployKindsMap.StatefulSet?.spec?.volumeClaimTemplates
      ? deployKindsMap.StatefulSet?.spec?.volumeClaimTemplates.map((item) => ({
          name: item.metadata?.name || '',
          path: item.metadata?.annotations?.path || '',
          value: Number(item.metadata?.annotations?.value || 0)
        }))
      : [],
    nodeName: appDeploy.spec?.template.spec?.nodeName || ''
  };
};

export const adaptEditAppData = (app: AppDetailType): AppEditType => {
  const keys: (keyof AppEditType)[] = [
    'appName',
    'containers',
    'currentContainerName',
    // 'imageName',
    // 'runCMD',
    // 'cmdParam',
    // 'cpu',
    // 'memory',
    // 'networks',
    // 'envs',
    // 'secret',
    'hpa',
    'replicas',
    'configMapList',
    'storeList',
    'gpu',
    'nodeName',
    'priority'
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
  const newVal = val.map((item) => item * gpuAmount);

  return newVal.map((item) => ({
    label: type === 'memory' ? (item >= 1024 ? `${item / 1024} G` : `${item} M`) : `${item / 1000}`,
    value: item
  }));
};
