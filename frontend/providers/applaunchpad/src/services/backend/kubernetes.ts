import * as k8s from '@kubernetes/client-node';
import * as yaml from 'js-yaml';
import type { V1Deployment, V1StatefulSet } from '@kubernetes/client-node';
import { UserQuotaItemType } from '@/types/user';
import { memoryFormatToMi, cpuFormatToM } from '@/utils/tools';

export function CheckIsInCluster(): [boolean, string] {
  if (
    process.env.KUBERNETES_SERVICE_HOST !== undefined &&
    process.env.KUBERNETES_SERVICE_HOST !== '' &&
    process.env.KUBERNETES_SERVICE_PORT !== undefined &&
    process.env.KUBERNETES_SERVICE_PORT !== ''
  ) {
    return [
      true,
      'https://' + process.env.KUBERNETES_SERVICE_HOST + ':' + process.env.KUBERNETES_SERVICE_PORT
    ];
  }
  return [false, ''];
}

/* init api */
export function K8sApi(config: string): k8s.KubeConfig {
  const kc = new k8s.KubeConfig();
  kc.loadFromString(config);

  const cluster = kc.getCurrentCluster();

  if (cluster) {
    const [inCluster, hosts] = CheckIsInCluster();

    const server: k8s.Cluster = {
      name: cluster.name,
      caData: cluster.caData,
      caFile: cluster.caFile,
      server: inCluster && hosts ? hosts : cluster.server,
      skipTLSVerify: cluster.skipTLSVerify
    };

    kc.clusters.forEach((item, i) => {
      if (item.name === cluster.name) {
        kc.clusters[i] = server;
      }
    });
  }
  return kc;
}

export async function CreateYaml(
  kc: k8s.KubeConfig,
  specs: k8s.KubernetesObject[]
): Promise<k8s.KubernetesObject[]> {
  const client = k8s.KubernetesObjectApi.makeApiClient(kc);
  const validSpecs = specs.filter((s) => s && s.kind && s.metadata);
  const created = [] as k8s.KubernetesObject[];

  try {
    for await (const spec of validSpecs) {
      spec.metadata = spec.metadata || {};
      spec.metadata.annotations = spec.metadata.annotations || {};
      delete spec.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration'];
      spec.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration'] =
        JSON.stringify(spec);

      console.log('create yaml: ', spec.kind);
      const response = await client.create(spec);
      created.push(response.body);
    }
  } catch (error: any) {
    console.log('create error');
    /* delete success specs */
    for (const spec of created) {
      try {
        await client.delete(spec);
        console.log('delete:', spec.kind);
      } catch (error) {
        error;
      }
    }
    // console.error(error, '<=create error')
    return Promise.reject(error);
  }
  return created;
}

export async function replaceYaml(
  kc: k8s.KubeConfig,
  specs: k8s.KubernetesObject[]
): Promise<k8s.KubernetesObject[]> {
  const client = k8s.KubernetesObjectApi.makeApiClient(kc);
  const validSpecs = specs.filter((s) => s && s.kind && s.metadata);
  const succeed = [] as k8s.KubernetesObject[];

  for (const spec of validSpecs) {
    spec.metadata = spec.metadata || {};
    spec.metadata.annotations = spec.metadata.annotations || {};
    delete spec.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration'];
    spec.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration'] =
      JSON.stringify(spec);

    try {
      // @ts-ignore
      const { body } = await client.read(spec);
      console.log('replace yaml: ', spec.kind);
      // update resource
      const response = await client.replace({
        ...spec,
        metadata: {
          ...spec.metadata,
          resourceVersion: body.metadata?.resourceVersion
        }
      });
      succeed.push(response.body);
    } catch (e: any) {
      // console.error(e?.body || e, "<=replace error")
      // no yaml, create it
      if (e?.body?.code && +e?.body?.code === 404) {
        try {
          console.log('create yaml: ', spec.kind);
          const response = await client.create(spec);
          succeed.push(response.body);
        } catch (error: any) {
          // console.error(error, '<=create error')
          return Promise.reject(error);
        }
      } else {
        return Promise.reject(e);
      }
    }
  }
  return succeed;
}

export async function getUserQuota(
  kc: k8s.KubeConfig,
  namespace: string
): Promise<UserQuotaItemType[]> {
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

  const {
    body: { status }
  } = await k8sApi.readNamespacedResourceQuota(`quota-${namespace}`, namespace);

  return [
    {
      type: 'cpu',
      limit: cpuFormatToM(status?.hard?.['limits.cpu'] || '') / 1000,
      used: cpuFormatToM(status?.used?.['limits.cpu'] || '') / 1000
    },
    {
      type: 'memory',
      limit: memoryFormatToMi(status?.hard?.['limits.memory'] || '') / 1024,
      used: memoryFormatToMi(status?.used?.['limits.memory'] || '') / 1024
    },
    {
      type: 'storage',
      limit: memoryFormatToMi(status?.hard?.['requests.storage'] || '') / 1024,
      used: memoryFormatToMi(status?.used?.['requests.storage'] || '') / 1024
    },
    {
      type: 'gpu',
      limit: Number(status?.hard?.['requests.nvidia.com/gpu'] || 0),
      used: Number(status?.used?.['requests.nvidia.com/gpu'] || 0)
    }
  ];
}

export async function getUserBalance(kc: k8s.KubeConfig) {
  const user = kc.getCurrentUser();
  if (!user) return 5;

  const k8sApi = kc.makeApiClient(k8s.CustomObjectsApi);

  const { body } = (await k8sApi.getNamespacedCustomObject(
    'account.sealos.io',
    'v1',
    'sealos-system',
    'accounts',
    user.name
  )) as { body: { status: { balance: number; deductionBalance: number } } };

  if (body?.status?.balance !== undefined && body?.status?.deductionBalance !== undefined) {
    return (body.status.balance - body.status.deductionBalance) / 1000000;
  }

  return 5;
}

export async function getK8s({ kubeconfig }: { kubeconfig: string }) {
  const kc = K8sApi(kubeconfig);
  const kube_user = kc.getCurrentUser();
  const client = k8s.KubernetesObjectApi.makeApiClient(kc);

  if (kube_user === null) {
    return Promise.reject('用户不存在');
  }

  const namespace = kc.contexts[0].namespace || `ns-${kube_user.name}`;

  const applyYamlList = async (yamlList: string[], type: 'create' | 'replace') => {
    // insert namespace
    const formatYaml: k8s.KubernetesObject[] = yamlList
      .map((item) => yaml.loadAll(item))
      .flat()
      .map((item: any) => {
        if (item.metadata) {
          item.metadata.namespace = namespace;
        }
        return item;
      });

    if (type === 'create') {
      return CreateYaml(kc, formatYaml);
    } else if (type === 'replace') {
      return replaceYaml(kc, formatYaml);
    }
    return CreateYaml(kc, formatYaml);
  };

  const getDeployApp = async (appName: string) => {
    let app: V1Deployment | V1StatefulSet | null = null;
    const k8sApp = kc.makeApiClient(k8s.AppsV1Api);
    const k8sCore = kc.makeApiClient(k8s.CoreV1Api);

    try {
      app = (await k8sApp.readNamespacedDeployment(appName, namespace)).body;
    } catch (error: any) {
      error;
    }

    try {
      app = (await k8sApp.readNamespacedStatefulSet(appName, namespace)).body;
    } catch (error: any) {
      error;
    }

    if (!app) {
      return Promise.reject('can not find app');
    }

    return app;
  };

  return Promise.resolve({
    kc,
    apiClient: client,
    k8sCore: kc.makeApiClient(k8s.CoreV1Api),
    k8sApp: kc.makeApiClient(k8s.AppsV1Api),
    k8sAutoscaling: kc.makeApiClient(k8s.AutoscalingV2Api),
    k8sNetworkingApp: kc.makeApiClient(k8s.NetworkingV1Api),
    k8sCustomObjects: kc.makeApiClient(k8s.CustomObjectsApi),
    metricsClient: new k8s.Metrics(kc),
    k8sExec: new k8s.Exec(kc),
    kube_user,
    namespace,
    applyYamlList,
    getDeployApp,
    getUserQuota: () => getUserQuota(kc, namespace),
    getUserBalance: () => getUserBalance(kc)
  });
}
