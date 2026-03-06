import { authAppToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { UserTask } from '@/types/user';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Config } from '@/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    if (!Config().launchpad.guideEnabled)
      return jsonRes(res, {
        data: {
          needGuide: false
        }
      });

    const token = await authAppToken(req.headers);
    if (!token) {
      return jsonRes(res, { code: 401, message: 'token is valid' });
    }

    const response = await fetch(`https://${Config().cloud.desktopDomain}/api/account/getTasks`, {
      method: 'GET',
      headers: {
        Authorization: token
      }
    });
    const result: {
      code: number;
      data: UserTask[];
      message: string;
    } = await response.json();

    if (result.code !== 200) {
      return jsonRes(res, {
        code: 500,
        message: 'desktop api is err'
      });
    }

    const launchpadTask = result.data.find((task) => task.taskType === 'LAUNCHPAD');
    const needGuide = launchpadTask ? !launchpadTask.isCompleted : false;

    jsonRes(res, {
      code: 200,
      data: { needGuide, task: launchpadTask }
    });
  } catch (err: any) {
    console.log(err);
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
