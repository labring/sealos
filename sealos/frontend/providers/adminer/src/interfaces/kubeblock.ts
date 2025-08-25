import * as k8s from '@kubernetes/client-node';

export interface KubeBlockCluster extends k8s.KubernetesObject {
  spec: KubeBlockClusterSpec;
  status?: KubeBlockClusterStatus;
}

export interface KubeBlockClusterSpec {
  affinity: object;
  clusterDefinitionRef: string;
  clusterVersionRef: string;
  componentSpecs: object[];
  terminationPolicy: string;
}
export interface KubeBlockClusterStatus {
  clusterDefGeneration: number;
  components: object;
  conditions: k8s.V1Condition[];
  observedGeneration: number;
  phase: string;
}

const labelName = 'clusterdefinition.kubeblocks.io/name';

export interface KubeBlockClusterType {
  driver: string;
}

const clusterTypeMap: Record<string, KubeBlockClusterType> = {
  postgresql: {
    driver: 'pgsql'
  },
  'apecloud-mysql': {
    driver: 'mysql'
  },
  mongodb: {
    driver: 'mongo'
  }
};

// this template is suite for golang(kubernetes and sealos)'s template engine
export async function generateKubeBlockClusters(
  kc: k8s.KubeConfig,
  namespace: string
): Promise<string[]> {
  try {
    const connections: string[] = [];
    // get kubeblock crd list
    const kubeblockResp = await kc
      .makeApiClient(k8s.CustomObjectsApi)
      .listNamespacedCustomObject(
        'apps.kubeblocks.io',
        'v1alpha1',
        namespace,
        'clusters',
        undefined,
        undefined,
        undefined,
        undefined,
        labelName
      );

    const kubeblockList = kubeblockResp.body as k8s.KubernetesListObject<KubeBlockCluster>;

    if (kubeblockList.items.length === 0) {
      return connections;
    }

    const secretClient = kc.makeApiClient(k8s.CoreV1Api);

    for (const item of kubeblockList.items) {
      if (item.status?.phase !== 'Running') {
        continue;
      }

      if (!item.metadata || !item.metadata.name || !item.metadata.namespace) {
        continue;
      }

      if (!item.metadata.labels || item.metadata.labels[labelName] === '') {
        continue;
      }

      const clusterType = item.metadata.labels[labelName];
      const clusterTypeObj = clusterTypeMap[clusterType];
      if (!clusterTypeObj) {
        continue;
      }

      // get secret
      const secretName = item.metadata.name + '-conn-credential';
      const secret = await secretClient.readNamespacedSecret(secretName, item.metadata.namespace);

      if (
        !secret.body?.data ||
        secret.body.data['username'] === '' ||
        secret.body.data['password'] === '' ||
        secret.body.data['endpoint'] === ''
      ) {
        continue;
      }

      const username = atob(secret.body.data['username']);
      const password = atob(secret.body.data['password']);
      const endpoint = atob(secret.body.data['endpoint']);

      const connection = clusterTypeObj.driver + '://' + username + ':' + password + '@' + endpoint;

      connections.push(connection);
    }

    return Promise.resolve(connections);
  } catch (error) {
    return Promise.resolve([]);
  }
}
