import { formData2Yamls } from '@/pages/app/edit';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { AppEditType } from '@/types/app';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Config } from '@/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { appForm } = req.body as { appForm: AppEditType };

    const { kc, applyYamlList } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    appForm.networks = appForm.networks.map((network) => ({
      ...network,
      domain: Config().cloud.domain
    }));

    const parseYamls = formData2Yamls(appForm, Config().cloud.userDomains);

    const yamls = parseYamls.map((item) => item.value);

    const result = await applyYamlList(yamls, 'create');

    jsonRes(res, { data: result });
  } catch (err: any) {
    console.log(err);
    jsonRes(res, {
      code: 500,
      error: err?.body || err
    });
  }
}
