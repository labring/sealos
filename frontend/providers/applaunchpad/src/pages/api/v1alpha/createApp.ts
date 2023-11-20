import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';
import { GetApps } from '../getApps';
import { AppEditType } from '@/types/app';
import { formData2Yamls } from '@/pages/app/edit';
import { getK8s } from '@/services/backend/kubernetes';
import { authSession } from '@/services/backend/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { appForm } = req.body as { appForm: AppEditType };

    const { applyYamlList } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const parseYamls = formData2Yamls(appForm);

    const yamls = parseYamls.map((item) => item.value);

    const result = await applyYamlList(yamls, 'create');

    jsonRes(res, { data: result });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
