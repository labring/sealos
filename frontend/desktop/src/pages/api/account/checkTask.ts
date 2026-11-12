import { verifyAccessToken, verifyAppToken } from '@/services/backend/auth';
import { globalPrisma } from '@/services/backend/db/init';
import { getUserKubeconfigNotPatch } from '@/services/backend/kubernetes/admin';
import { K8sApi } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import { switchKubeconfigNamespace } from '@/utils/switchKubeconfigNamespace';
import type { NextApiRequest, NextApiResponse } from 'next';
import { TaskStatus, TaskType } from 'prisma/global/generated/client';
import * as k8s from '@kubernetes/client-node';
import { templateDeployKey } from '@/constants/account';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = (await verifyAccessToken(req.headers)) || (await verifyAppToken(req.headers));
    if (!payload) return jsonRes(res, { code: 401, message: 'Failed to get info' });
    const namespace = payload.workspaceId;
    const _kc = await getUserKubeconfigNotPatch(payload.userCrName);
    if (!_kc) return jsonRes(res, { code: 404, message: 'User is not found' });
    const realKc = switchKubeconfigNamespace(_kc, namespace);
    const kc = K8sApi(realKc);
    if (!kc) return jsonRes(res, { code: 404, message: 'The kubeconfig is not found' });

    const k8sApp = kc.makeApiClient(k8s.AppsV1Api);
    const k8sCustomObjects = kc.makeApiClient(k8s.CustomObjectsApi);

    const userTasks = await globalPrisma.userTask.findMany({
      where: {
        userUid: payload.userUid,
        status: { not: TaskStatus.COMPLETED }
      },
      include: { task: true }
    });

    const [deployments, statefulsets, instances, clusters, devboxes] = await Promise.all([
      k8sApp.listNamespacedDeployment({
        namespace,
        labelSelector: `!${templateDeployKey}`
      }),
      k8sApp.listNamespacedStatefulSet({
        namespace,
        labelSelector: `!${templateDeployKey}`
      }),
      k8sCustomObjects.listNamespacedCustomObject({
        group: 'app.sealos.io',
        version: 'v1',
        namespace,
        plural: 'instances'
      }),
      k8sCustomObjects.listNamespacedCustomObject({
        group: 'apps.kubeblocks.io',
        version: 'v1alpha1',
        namespace,
        plural: 'clusters',
        labelSelector: `!${templateDeployKey}`
      }),
      k8sCustomObjects.listNamespacedCustomObject({
        group: 'devbox.sealos.io',
        version: 'v1alpha1',
        namespace,
        plural: 'devboxes'
      })
    ]);

    const tasksToUpdate = userTasks.filter((userTask) => {
      switch (userTask.task.taskType) {
        case TaskType.LAUNCHPAD:
          return deployments.items.length > 0 || statefulsets.items.length > 0;
        case TaskType.APPSTORE:
          return instances.items.length > 0;
        case TaskType.DATABASE:
          return clusters.items.length > 0;
        case TaskType.DEVBOX:
          return devboxes.items.length > 0;
        default:
          return false;
      }
    });

    if (tasksToUpdate.length > 0) {
      await globalPrisma.userTask.updateMany({
        where: {
          OR: tasksToUpdate.map((task) => ({
            userUid: task.userUid,
            taskId: task.taskId
          }))
        },
        data: {
          status: TaskStatus.COMPLETED,
          completedAt: new Date()
        }
      });
    }

    jsonRes(res, { code: 200, data: `${tasksToUpdate.length} tasks updated successfully` });
  } catch (error) {
    console.error('Error processing request:', error);
    jsonRes(res, { code: 500, message: 'Internal server error' });
  }
}
