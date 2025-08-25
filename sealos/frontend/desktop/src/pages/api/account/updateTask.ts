import { verifyAccessToken, verifyAppToken } from '@/services/backend/auth';
import { globalPrisma } from '@/services/backend/db/init';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
import { TaskStatus } from 'prisma/global/generated/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = (await verifyAccessToken(req.headers)) || (await verifyAppToken(req.headers));
    if (!payload) return jsonRes(res, { code: 401, message: 'Token is invalid' });

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
