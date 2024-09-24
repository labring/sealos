import { verifyAccessToken } from '@/services/backend/auth';
import { globalPrisma } from '@/services/backend/db/init';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'Token is invaild' });

    const userTasks = await globalPrisma.userTask.findMany({
      where: {
        userUid: payload.userUid,
        task: {
          isActive: true
        }
      },
      include: {
        task: true
      },
      orderBy: {
        task: {
          createdAt: 'asc'
        }
      }
    });

    const tasks = userTasks.map((ut) => ({
      id: ut.task.id,
      title: ut.task.title,
      description: ut.task.description,
      reward: ut.task.reward.toString(),
      order: ut.task.order,
      taskType: ut.task.taskType,
      isCompleted: ut.status === 'COMPLETED',
      completedAt: ut.completedAt
    }));

    jsonRes(res, {
      code: 200,
      data: tasks
    });
  } catch (error) {
    return jsonRes(res, { code: 500, message: 'error' });
  }
}
