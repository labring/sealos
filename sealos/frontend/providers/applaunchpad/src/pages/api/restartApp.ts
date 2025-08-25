import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import dayjs from 'dayjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { appName } = req.query as { appName: string };
    if (!appName) {
      throw new Error('appName is empty');
    }
    const { getDeployApp, apiClient } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const app = await getDeployApp(appName);

    if (!app.spec?.template.metadata?.labels) {
      throw new Error('app data error');
    }

    app.spec.template.metadata.labels['restartTime'] = `${dayjs().format('YYYYMMDDHHmmss')}`;
    await apiClient.replace(app);

    jsonRes(res);
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
