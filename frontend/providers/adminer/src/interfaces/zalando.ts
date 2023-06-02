import * as k8s from '@kubernetes/client-node';

export interface zalandoPGCluster extends k8s.KubernetesObject {
  spec: zalandoPGClusterSpec;
  status?: zalandoPGClusterStatus;
}

export interface zalandoPGClusterSpec {
  databases: zalandoPGClusterDatabasesSpec;
}

export interface zalandoPGClusterDatabasesSpec {
  rootdb?: string;
}
export interface zalandoPGClusterStatus {
  PostgresClusterStatus: string;
}

// get acid.zalan.do/v1 just postgresqls
export async function generateZalanDoPostgresClusters(
  kc: k8s.KubeConfig,
  namespace: string
): Promise<string[]> {
  try {
    const connections: string[] = [];

    // get pg crd list
    const resp = await kc
      .makeApiClient(k8s.CustomObjectsApi)
      .listNamespacedCustomObject('acid.zalan.do', 'v1', namespace, 'postgresqls');

    const list = resp.body as k8s.KubernetesListObject<zalandoPGCluster>;

    if (list.items.length === 0) {
      return connections;
    }

    const secretClient = kc.makeApiClient(k8s.CoreV1Api);

    for (const item of list.items) {
      if (!item.metadata || item.status?.PostgresClusterStatus !== 'Running') {
        continue;
      }

      if (!item.metadata.name || !item.metadata.namespace) {
        continue;
      }

      // get secret
      const rootdb = item.spec.databases?.rootdb || 'root';
      const secretName =
        rootdb + '.' + item.metadata.name + '.credentials.postgresql.acid.zalan.do';
      const secret = await secretClient.readNamespacedSecret(secretName, item.metadata.namespace);

      if (!secret.body?.data) {
        continue;
      }

      const username = atob(secret.body.data['username']);
      const password = atob(secret.body.data['password']);

      // custom join
      const endpoint =
        item.metadata.name + '.' + item.metadata.namespace + '.svc.cluster.local:5432';

      const connection = 'pgsql://' + username + ':' + password + '@' + endpoint;
      connections.push(connection);
    }

    return Promise.resolve(connections);
  } catch (error) {
    return Promise.resolve([]);
  }
}
