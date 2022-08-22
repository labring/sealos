import * as k8s from '@kubernetes/client-node';

var kc_api: k8s.CoreV1Api;

export function K8sApi(config: string): k8s.CoreV1Api {
  if (kc_api === undefined) {
    const kc = new k8s.KubeConfig();
    kc.loadFromString(config);
    kc_api = kc.makeApiClient(k8s.CoreV1Api);
  }
  return kc_api;
}

export async function listPods(): Promise<any> {
  const kc = new k8s.KubeConfig();
  kc.loadFromDefault();

  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

  return k8sApi.listNamespacedPod('default');
}
