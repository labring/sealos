import { CreateAppRequestSchema } from '@/constants/schema';
import { formData2Yamls } from '@/pages/app/edit';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { serverLoadInitData } from '@/store/static';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const validatedResult = CreateAppRequestSchema.safeParse(req.body);

    if (!validatedResult.success) {
      return jsonRes(res, {
        code: 400,
        error: validatedResult.error
      });
    }

    const { appForm } = validatedResult.data;

    // important load env
    serverLoadInitData();

    const { kc, applyYamlList } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    appForm.networks = appForm.networks.map((network) => ({
      ...network,
      domain: global.AppConfig.cloud.domain
    }));

    const parseYamls = formData2Yamls(appForm);

    const yamls = parseYamls.map((item) => item.value);

    await applyYamlList(yamls, 'create');

    jsonRes(res, { data: 'app created' });
  } catch (err: any) {
    console.log(err);
    jsonRes(res, {
      code: 500,
      error: err?.body || err
    });
  }
}
