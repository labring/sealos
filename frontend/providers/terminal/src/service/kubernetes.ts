import * as k8s from '@kubernetes/client-node'
import http from 'http'
import * as yaml from 'js-yaml'

export type CRDMeta = {
  group: string // group
  version: string // version
  namespace: string // namespace
  plural: string // type
}

export function K8sApi(config: string): k8s.KubeConfig {
  const kc = new k8s.KubeConfig()
  kc.loadFromString(config)

  const cluster = kc.getCurrentCluster()
  if (cluster !== null) {
    let server: k8s.Cluster

    const [inCluster, hosts] = CheckIsInCluster()
    if (inCluster && hosts !== '') {
      server = {
        name: cluster.name,
        caData: cluster.caData,
        caFile: cluster.caFile,
        server: hosts,
        skipTLSVerify: cluster.skipTLSVerify,
      }
    } else {
      server = {
        name: cluster.name,
        caData: cluster.caData,
        caFile: cluster.caFile,
        server: 'https://apiserver.cluster.local:6443',
        skipTLSVerify: cluster.skipTLSVerify,
      }
    }
    kc.clusters.forEach((item, i) => {
      if (item.name === cluster.name) {
        kc.clusters[i] = server
      }
    })
  }

  return kc
}

export function GetUserDefaultNameSpace(user: string): string {
  return 'ns-' + user
}

export async function GetCRD(
  kc: k8s.KubeConfig,
  meta: CRDMeta,
  name: string
): Promise<{
  response: http.IncomingMessage
  body: k8s.V1ResourceQuota
}> {
  return kc
    .makeApiClient(k8s.CustomObjectsApi)
    .getNamespacedCustomObject(
      meta.group,
      meta.version,
      meta.namespace,
      meta.plural,
      name
    )
}

export async function ApplyYaml(
  kc: k8s.KubeConfig,
  spec_str: string
): Promise<k8s.KubernetesObject[]> {
  const client = k8s.KubernetesObjectApi.makeApiClient(kc)
  const specs = yaml.loadAll(spec_str) as k8s.KubernetesObject[]
  const validSpecs = specs.filter((s) => s && s.kind && s.metadata)
  const created: k8s.KubernetesObject[] = []
  for (const spec of validSpecs) {
    // this is to convince the old version of TypeScript that metadata exists even though we already filtered specs
    // without metadata out
    spec.metadata = spec.metadata || {}
    spec.metadata.annotations = spec.metadata.annotations || {}
    delete spec.metadata.annotations[
      'kubectl.kubernetes.io/last-applied-configuration'
    ]
    spec.metadata.annotations[
      'kubectl.kubernetes.io/last-applied-configuration'
    ] = JSON.stringify(spec)
    try {
      // try to get the resource, if it does not exist an error will be thrown and we will end up in the catch
      // block.
      // TODO: temp fix
      await client.read(spec as any)
      // await client.read<k8s.KubernetesObject>(spec as any);
      // we got the resource, so it exists, so patch it
      //
      // Note that this could fail if the spec refers to a custom resource. For custom resources you may need
      // to specify a different patch merge strategy in the content-type header.
      //
      // See: https://github.com/kubernetes/kubernetes/issues/97423
      const response = await client.patch(spec)
      created.push(response.body)
    } catch (e) {
      // we did not get the resource, so it does not exist, so create it
      const response = await client.create(spec)
      created.push(response.body)
    }
  }
  return created
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
      'https://' +
        process.env.KUBERNETES_SERVICE_HOST +
        ':' +
        process.env.KUBERNETES_SERVICE_PORT,
    ]
  }
  return [false, '']
}
