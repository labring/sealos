import { verifyAccessToken, verifyAppToken } from '@/services/backend/auth';
import { globalPrisma } from '@/services/backend/db/init';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = (await verifyAccessToken(req.headers)) || (await verifyAppToken(req.headers));
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
          order: 'asc'
        }
      }
    });

    const tasks = userTasks.map((ut) => ({
      id: ut.task.id,
      title: typeof ut.task.title === 'string' ? JSON.parse(ut.task.title) : ut.task.title,
      description: ut.task.description,
      reward: ut.task.reward.toString(),
      order: ut.task.order,
      taskType: ut.task.taskType,
      isCompleted: ut.status === 'COMPLETED',
      completedAt: ut.completedAt,
      isNewUserTask: ut.task.isNewUserTask
    }));

    const allTasksCompleted = tasks.every((task) => task.isCompleted);

    jsonRes(res, {
      code: 200,
      data: allTasksCompleted ? [] : tasks,
      message: allTasksCompleted ? 'All tasks completed' : 'Tasks fetched'
    });
  } catch (error) {
    console.log(error);
    return jsonRes(res, { code: 500, message: 'error' });
  }
}
