import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { EnvResponse } from '@/types/index';
import { getTemplateEnvs } from '@/utils/tools';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  let user_namespace = '';

  try {
    const { namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });
    user_namespace = namespace;
  } catch (error) {
    console.log(error, 'errpr-');
  }

  jsonRes<EnvResponse>(res, {
    data: getTemplateEnvs(user_namespace)
  });
}
