import * as k8s from '@kubernetes/client-node';
import * as yaml from 'js-yaml';

// Load default kc
export function K8sApiDefault(): k8s.KubeConfig {
  const kc = new k8s.KubeConfig();
  kc.loadFromDefault();
  return kc;
}

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

  if (cluster && process.env.NODE_ENV !== 'development') {
    const [inCluster, hosts] = CheckIsInCluster();

    const server: k8s.Cluster = {
      name: cluster.name,
      caData: cluster.caData,
      caFile: cluster.caFile,
      server: inCluster && hosts ? hosts : 'https://apiserver.cluster.local:6443',
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

export type CRDMeta = {
  group: string; // group
  version: string; // version
  namespace: string; // namespace
  plural: string; // type
};

export async function CreateYaml(
  kc: k8s.KubeConfig,
  specs: k8s.KubernetesObject[],
  dryRun?: 'All'
): Promise<k8s.KubernetesObject[]> {
  const client = k8s.KubernetesObjectApi.makeApiClient(kc);
  const validSpecs = specs.filter((s) => s && s.kind && s.metadata);
  const created = [] as k8s.KubernetesObject[];

  try {
    for (const spec of validSpecs) {
      spec.metadata = spec.metadata || {};
      spec.metadata.annotations = spec.metadata.annotations || {};
      delete spec.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration'];
      spec.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration'] =
        JSON.stringify(spec);

      console.log('create yaml: ', spec.kind);
      const response = await client.create(spec, undefined, dryRun ? dryRun : undefined);
      created.push(response.body);
    }
  } catch (error: any) {
    console.log('create yaml error');
    /* delete success specs */
    for (const spec of created) {
      try {
        console.log('delete:', spec.kind);
        await client.delete(spec);
      } catch (error: any) {
        console.log('delete error:', spec.kind, error.body);
      }
    }
    return Promise.reject(error.body || error);
  }
  return created;
}

export async function updateYaml(
  kc: k8s.KubeConfig,
  specs: k8s.KubernetesObject[],
  canCreate = false
): Promise<k8s.KubernetesObject[]> {
  const client = k8s.KubernetesObjectApi.makeApiClient(kc);
  const validSpecs = specs.filter((s) => s && s.kind && s.metadata);
  const created = [] as k8s.KubernetesObject[];

  try {
    for (const spec of validSpecs) {
      spec.metadata = spec.metadata || {};
      spec.metadata.annotations = spec.metadata.annotations || {};
      delete spec.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration'];
      spec.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration'] =
        JSON.stringify(spec);

      console.log('update yaml: ', spec.kind);
      const response = await client.create(spec);
      created.push(response.body);
    }
  } catch (error: any) {
    /* delete success specs */
    for (const spec of validSpecs) {
      try {
        console.log('delete:', spec.kind);
        await client.delete(spec);
      } catch (error) {
        error;
      }
    }
    if (error.body.reason === 'AlreadyExists' && canCreate) {
      return updateYaml(kc, specs);
    }
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

export async function delYaml(kc: k8s.KubeConfig, specs: k8s.KubernetesObject[]) {
  const client = k8s.KubernetesObjectApi.makeApiClient(kc);
  const validSpecs = specs.filter((s) => s && s.kind && s.metadata);

  try {
    for (const spec of validSpecs) {
      console.log('delete:', spec.kind);
      await client.delete(spec);
    }
  } catch (error: any) {
    // console.error(error, '<=create error')
    return Promise.reject(error);
  }
}

export function GetUserDefaultNameSpace(user: string): string {
  return 'ns-' + user;
}

export async function getK8s({ kubeconfig }: { kubeconfig: string }) {
  const kc = K8sApi(kubeconfig);
  const kube_user = kc.getCurrentUser();
  const client = k8s.KubernetesObjectApi.makeApiClient(kc);

  if (kube_user === null) {
    return Promise.reject('用户不存在');
  }

  const namespace = kc.contexts[0].namespace || GetUserDefaultNameSpace(kube_user.name);

  const applyYamlList = async (yamlList: string[], type: 'create' | 'replace' | 'dryrun') => {
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
    } else if (type === 'dryrun') {
      return CreateYaml(kc, formatYaml, 'All');
    }
    return CreateYaml(kc, formatYaml);
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
    k8sEvents: kc.makeApiClient(k8s.EventsV1Api),
    k8sAuth: kc.makeApiClient(k8s.RbacAuthorizationV1Api),
    k8sBatch: kc.makeApiClient(k8s.BatchV1Api),
    k8sApiextensions: kc.makeApiClient(k8s.ApiextensionsV1Api),
    kube_user,
    namespace,
    applyYamlList
  });
}
