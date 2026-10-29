import * as k8s from '@kubernetes/client-node';
import * as yaml from 'js-yaml';

export function K8sApi(config: string): k8s.KubeConfig {
  const kc = new k8s.KubeConfig();
  kc.loadFromString(config);

  const cluster = kc.getCurrentCluster();

  if (cluster && process.env.NODE_ENV !== 'development') {
    const [inCluster, hosts] = CheckIsInCluster();
    const server = {
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
export async function ListPods(kc: k8s.KubeConfig, ns: string): Promise<k8s.V1PodList> {
  return kc.makeApiClient(k8s.CoreV1Api).listNamespacedPod({ namespace: ns });
}

export type CRDMeta = {
  group: string; // group
  version: string; // version
  namespace: string; // namespace
  plural: string; // type
};

export async function GetCRD(kc: k8s.KubeConfig, meta: CRDMeta, name: string): Promise<any> {
  return kc.makeApiClient(k8s.CustomObjectsApi).getNamespacedCustomObject({
    group: meta.group,
    version: meta.version,
    namespace: meta.namespace,
    plural: meta.plural,
    name // resource name
  });
}

export async function ListCRD(kc: k8s.KubeConfig, meta: CRDMeta): Promise<any> {
  return kc
    .makeApiClient(k8s.CustomObjectsApi)
    .listNamespacedCustomObject({
      group: meta.group,
      version: meta.version,
      namespace: meta.namespace,
      plural: meta.plural
    });
}

export async function ApplyYaml(
  kc: k8s.KubeConfig,
  spec_str: string
): Promise<k8s.KubernetesObject[]> {
  const client = k8s.KubernetesObjectApi.makeApiClient(kc);
  const specs = yaml.loadAll(spec_str) as k8s.KubernetesObject[];
  const validSpecs = specs.filter((s) => s && s.kind && s.metadata);
  const created = [] as k8s.KubernetesObject[];
  for (const spec of validSpecs) {
    // this is to convince the old version of TypeScript that metadata exists even though we already filtered specs
    // without metadata out
    spec.metadata = spec.metadata || {};
    spec.metadata.annotations = spec.metadata.annotations || {};
    delete spec.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration'];
    spec.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration'] =
      JSON.stringify(spec);
    try {
      // try to get the resource, if it does not exist an error will be thrown and we will end up in the catch
      // block.
      // TODO: temp fix
      // @ts-ignore
      await client.read(spec);
      // await client.read<k8s.KubernetesObject>(spec as any);
      // we got the resource, so it exists, so patch it
      //
      // Note that this could fail if the spec refers to a custom resource. For custom resources you may need
      // to specify a different patch merge strategy in the content-type header.
      //
      // See: https://github.com/kubernetes/kubernetes/issues/97423
      const response = await client.patch(spec);
      created.push(response);
    } catch (e) {
      // we did not get the resource, so it does not exist, so create it
      const response = await client.create(spec);
      created.push(response);
    }
  }
  return created;
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

export function GetUserDefaultNameSpace(user: string): string {
  return 'ns-' + user;
}

export async function DeleteCRD(
  kc: k8s.KubeConfig,
  meta: CRDMeta,
  name: string
): Promise<any> {
  return kc.makeApiClient(k8s.CustomObjectsApi).deleteNamespacedCustomObject({
    group: meta.group,
    version: meta.version,
    namespace: meta.namespace,
    plural: meta.plural,
    name // resource name
  });
}

export async function UpdateCRD(
  kc: k8s.KubeConfig,
  meta: CRDMeta,
  name: string,
  patch: any[]
): Promise<any> {
  return kc.makeApiClient(k8s.CustomObjectsApi).patchNamespacedCustomObject(
    {
      group: meta.group,
      version: meta.version,
      namespace: meta.namespace,
      plural: meta.plural,
      name, // resource name
      body: patch // json patch
    },
    {
      // the object-args API sends patches as application/json; JSON patches
      // need the json-patch content type for the apiserver to accept them
      middleware: [
        {
          pre: (context) =>
            new k8s.Observable(
              Promise.resolve(context).then((ctx) => {
                ctx.setHeaderParam('Content-Type', k8s.PatchStrategy.JsonPatch);
                return ctx;
              })
            ),
          post: (context) => new k8s.Observable(Promise.resolve(context))
        }
      ]
    }
  );
}

export async function GetService(
  kc: k8s.KubeConfig,
  name: string,
  namespace: string
): Promise<k8s.V1Service> {
  return kc.makeApiClient(k8s.CoreV1Api).readNamespacedService({ name, namespace });
}

export async function GetSecret(
  kc: k8s.KubeConfig,
  name: string,
  namespace: string
): Promise<k8s.V1Secret> {
  return kc.makeApiClient(k8s.CoreV1Api).readNamespacedSecret({ name, namespace });
}

export async function ListSecret(
  kc: k8s.KubeConfig,
  namespace: string,
  fieldSelector: string
): Promise<k8s.V1SecretList> {
  return kc
    .makeApiClient(k8s.CoreV1Api)
    .listNamespacedSecret({ namespace, fieldSelector });
}

export async function ListClusterObject(
  kc: k8s.KubeConfig,
  meta: CRDMeta,
  labelSelector: string,
  limit: number,
  _continue: string
): Promise<any> {
  return kc
    .makeApiClient(k8s.CustomObjectsApi)
    .listClusterCustomObject({
      group: meta.group,
      version: meta.version,
      plural: meta.plural,
      labelSelector,
      limit,
      _continue
    });
}

export async function GetClusterObject(
  kc: k8s.KubeConfig,
  meta: CRDMeta,
  name: string
): Promise<any> {
  return kc.makeApiClient(k8s.CustomObjectsApi).getClusterCustomObject({
    group: meta.group,
    version: meta.version,
    plural: meta.plural,
    name // resource name
  });
}
export async function GetConfigMap(kc: k8s.KubeConfig, namespace: string, name: string) {
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
  return k8sApi.readNamespacedConfigMap({ name, namespace });
}
