import { verifyAccessToken, verifyAppToken } from '@/services/backend/auth';
import { globalPrisma } from '@/services/backend/db/init';
import { getUserKubeconfigNotPatch } from '@/services/backend/kubernetes/admin';
import { K8sApi } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import { switchKubeconfigNamespace } from '@/utils/switchKubeconfigNamespace';
import type { NextApiRequest, NextApiResponse } from 'next';
import { TaskStatus } from 'prisma/global/generated/client';
import * as k8s from '@kubernetes/client-node';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = (await verifyAccessToken(req.headers)) || (await verifyAppToken(req.headers));
    if (!payload) return jsonRes(res, { code: 401, message: 'failed to get info' });
    const namespace = payload.workspaceId;
    const _kc = await getUserKubeconfigNotPatch(payload.userCrName);
    if (!_kc) return jsonRes(res, { code: 404, message: 'user is not found' });
    const realKc = switchKubeconfigNamespace(_kc, namespace);
    const kc = K8sApi(realKc);
    if (!kc) return jsonRes(res, { code: 404, message: 'The kubeconfig is not found' });

    const core = kc.makeApiClient(k8s.CoreV1Api);
    console.log(kc, '123123');

    if (req.method !== 'POST') {
      return jsonRes(res, { code: 405, message: 'Method not allowed' });
    }

    const { taskId } = req.body as { taskId: string };
    if (!taskId) {
      return jsonRes(res, { code: 400, message: 'Task ID is required' });
    }

    const task = await globalPrisma.userTask.findUnique({
      where: {
        userUid_taskId: {
          userUid: payload.userUid,
          taskId: taskId
        }
      }
    });

    if (!task) {
      return jsonRes(res, { code: 404, message: 'Task not found' });
    }

    if (task.status === TaskStatus.COMPLETED) {
      return jsonRes(res, { code: 200, message: 'Task is already completed' });
    }

    const updatedTask = await globalPrisma.userTask.update({
      where: {
        userUid_taskId: {
          userUid: payload.userUid,
          taskId: taskId
        }
      },
      data: { status: TaskStatus.COMPLETED, completedAt: new Date() }
    });

    jsonRes(res, { code: 200, data: 'success' });
  } catch (error) {
    jsonRes(res, { code: 500, message: 'Internal server error' });
  }
}
