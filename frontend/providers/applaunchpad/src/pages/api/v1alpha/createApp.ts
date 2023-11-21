import { formData2Yamls } from '@/pages/app/edit';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { serverLoadInitData } from '@/store/static';
import { AppEditType } from '@/types/app';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { appForm } = req.body as { appForm: AppEditType };
    // important load env
    serverLoadInitData();

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
      error: err?.body || err
    });
  }
}
