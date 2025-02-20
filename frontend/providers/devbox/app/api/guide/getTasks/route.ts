import { jsonRes } from '@/services/backend/response';
import { UserTask } from '@/types/user';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    if (process.env.GUIDE_ENABLED !== 'true') {
      return jsonRes({
        data: {
          needGuide: false
        }
      });
    }
    const data = (await req.json()) as {
      desktopToAppToken: string;
    };

    if (!data.desktopToAppToken) {
      return jsonRes({ code: 401, message: 'token is valid' });
    }

    const domain = process.env.SEALOS_DOMAIN;

    const response = await fetch(`https://${domain}/api/account/getTasks`, {
      method: 'GET',
      headers: {
        Authorization: data.desktopToAppToken
      }
    });

    const result: {
      code: number;
      data: UserTask[];
      message: string;
    } = await response.json();

    console.log('result', result);

    if (result.code !== 200) {
      return jsonRes({
        code: 500,
        message: 'desktop api is err'
      });
    }

    const launchpadTask = result.data.find((task) => task.taskType === 'DEVBOX');
    const needGuide = launchpadTask ? !launchpadTask.isCompleted : false;

    return jsonRes({
      code: 200,
      data: { needGuide, task: launchpadTask }
    });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    });
  }
}
