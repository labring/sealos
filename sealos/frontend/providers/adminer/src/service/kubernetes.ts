import * as k8s from '@kubernetes/client-node';
import http from 'http';

export type CRDMeta = {
  group: string; // group
  version: string; // version
  namespace: string; // namespace
  plural: string; // type
};

export function K8sApi(config: string): k8s.KubeConfig {
  const kc = new k8s.KubeConfig();
  kc.loadFromString(config);

  const cluster = kc.getCurrentCluster();
  if (cluster !== null) {
    let server: k8s.Cluster;

    const [inCluster, hosts] = CheckIsInCluster();
    if (inCluster && hosts !== '') {
      server = {
        name: cluster.name,
        caData: cluster.caData,
        caFile: cluster.caFile,
        server: hosts,
        skipTLSVerify: cluster.skipTLSVerify
      };
    } else {
      server = {
        name: cluster.name,
        caData: cluster.caData,
        caFile: cluster.caFile,
        server: 'https://apiserver.cluster.local:6443',
        // server: cluster.server,
        skipTLSVerify: cluster.skipTLSVerify
      };
    }
    kc.clusters.forEach((item, i) => {
      if (item.name === cluster.name) {
        kc.clusters[i] = server;
      }
    });
  }

  return kc;
}

export function GetUserDefaultNameSpace(user: string): string {
  return 'ns-' + user;
}

export async function GetCRD(
  kc: k8s.KubeConfig,
  meta: CRDMeta,
  name: string
): Promise<{
  response: http.IncomingMessage;
  body: k8s.V1ResourceQuota;
}> {
  return kc
    .makeApiClient(k8s.CustomObjectsApi)
    .getNamespacedCustomObject(meta.group, meta.version, meta.namespace, meta.plural, name);
}

export async function CreateOrReplaceYaml(
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
      // no yaml, create it
      if (e?.body?.code && +e?.body?.code === 404) {
        try {
          const response = await client.create(spec);
          succeed.push(response.body);
        } catch (error: any) {
          return Promise.reject(error);
        }
      } else {
        return Promise.reject(e);
      }
    }
  }
  return succeed;
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
