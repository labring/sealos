import * as k8s from '@kubernetes/client-node';
import * as yaml from 'js-yaml';
import http from 'http';

export function K8sApi(config: string): k8s.KubeConfig {
  const kc = new k8s.KubeConfig();
  kc.loadFromString(config);

  return kc;
}

export async function ListPods(
  kc: k8s.KubeConfig,
  ns: string
): Promise<{
  response: http.IncomingMessage;
  body: k8s.V1PodList;
}> {
  return kc.makeApiClient(k8s.CoreV1Api).listNamespacedPod(ns);
}

export async function ReadService(
  kc: k8s.KubeConfig,
  name: string,
  ns: string
): Promise<{
  response: http.IncomingMessage;
  body: k8s.V1Service;
}> {
  // debugger;
  return kc.makeApiClient(k8s.CoreV1Api).readNamespacedService(name, ns);
}

export async function ApplyYaml(
  kc: k8s.KubeConfig,
  spec_str: string
): Promise<k8s.KubernetesObject[]> {
  const client = k8s.KubernetesObjectApi.makeApiClient(kc);
  const specs: k8s.KubernetesObject[] = yaml.loadAll(spec_str) as k8s.KubernetesObject[];
  const validSpecs = specs.filter((s) => s && s.kind && s.metadata);
  const created: k8s.KubernetesObject[] = [];
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
      await client.read(spec);
      // we got the resource, so it exists, so patch it
      //
      // Note that this could fail if the spec refers to a custom resource. For custom resources you may need
      // to specify a different patch merge strategy in the content-type header.
      //
      // See: https://github.com/kubernetes/kubernetes/issues/97423
      const response = await client.patch(spec);
      created.push(response.body);
    } catch (e) {
      // we did not get the resource, so it does not exist, so create it
      const response = await client.create(spec);
      created.push(response.body);
    }
  }
  return created;
}

export function CheckIsInCluster(): boolean {
  if (process.env.KUBERNETES_SERVICE_HOST !== '' && process.env.KUBERNETES_SERVICE_PORT !== '') {
    return true;
  }
  return false;
}
