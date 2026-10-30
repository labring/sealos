import { verifyAccessToken } from '@/services/backend/auth';
import { getUserKubeconfigNotPatch } from '@/services/backend/kubernetes/admin';
import { K8sApi } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import { switchKubeconfigNamespace } from '@/utils/switchKubeconfigNamespace';
import * as k8s from '@kubernetes/client-node';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'failed to get info' });
    const namespace = payload.workspaceId;
    const _kc = await getUserKubeconfigNotPatch(payload.userCrName);
    if (!_kc) return jsonRes(res, { code: 404, message: 'user is not found' });
    const realKc = switchKubeconfigNamespace(_kc, namespace);
    const kc = K8sApi(realKc);
    if (!kc) return jsonRes(res, { code: 404, message: 'The kubeconfig is not found' });

    const k8sCore = kc.makeApiClient(k8s.CoreV1Api);
    const k8sApp = kc.makeApiClient(k8s.AppsV1Api);
    const k8sCustomObjects = kc.makeApiClient(k8s.CustomObjectsApi);

    // Get devbox running count
    const runningDevboxes = await k8sCustomObjects
      .listNamespacedCustomObject({
        group: 'devbox.sealos.io',
        version: 'v1alpha1',
        namespace,
        plural: 'devboxes'
      })
      .then(
        (devboxResponse) =>
          ((devboxResponse as any)?.items || []).filter(
            (devbox: any) => devbox?.status?.phase === 'Running'
          ).length
      )
      .catch(() => 0);

    // Get database running count
    const runningDatabases = await k8sCustomObjects
      .listNamespacedCustomObject({
        group: 'apps.kubeblocks.io',
        version: 'v1alpha1',
        namespace,
        plural: 'clusters',
        labelSelector: 'clusterdefinition.kubeblocks.io/name'
      })
      .then(
        (dbResponse) =>
          ((dbResponse as any)?.items || []).filter((db: any) => db?.status?.phase === 'Running')
            .length
      )
      .catch(() => 0);

    // Get all deployments and statefulsets with app-deploy-manager label
    const runningLaunchpadApps = await Promise.all([
      k8sApp.listNamespacedDeployment({
        namespace,
        labelSelector: 'cloud.sealos.io/app-deploy-manager'
      }),
      k8sApp.listNamespacedStatefulSet({
        namespace,
        labelSelector: 'cloud.sealos.io/app-deploy-manager'
      })
    ])
      .then((promises) =>
        Promise.all(
          promises
            .flatMap((appList) => appList.items)
            .map((app) =>
              k8sCore.listNamespacedPod({
                namespace,
                labelSelector: `app=${app.metadata!.name}`
              })
            )
        )
      )
      .then((appPodLists) =>
        appPodLists
          .map(({ items: pods }) => {
            // Returns true if have at least one pod running
            return pods.some((pod: any) => {
              const container = pod.status?.containerStatuses || [];
              if (container.length > 0) {
                const stateObj = container[0].state;
                return stateObj && stateObj['running'];
              }
              return false;
            });
          })
          // Count running apps
          .reduce((acc, running) => acc + (running ? 1 : 0), 0)
      )
      .catch(() => 0);

    return jsonRes(res, {
      code: 200,
      data: {
        runningCount: {
          devbox: runningDevboxes,
          database: runningDatabases,
          applaunchpad: runningLaunchpadApps
        }
      }
    });
  } catch (err) {
    jsonRes(res, { code: 500, data: err });
  }
}
