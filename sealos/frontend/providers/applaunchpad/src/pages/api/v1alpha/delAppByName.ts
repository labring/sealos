import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';
import { deleteAppByName } from '@/services/backend/appService';
import { createK8sContext } from '@/services/backend';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { name } = req.query as { name: string };
    if (!name) {
      throw new Error('deploy name is empty');
    }

    const k8s = await createK8sContext(req);
    await deleteAppByName(name, k8s);

    jsonRes(res, {
      message: 'successfully deleted'
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
