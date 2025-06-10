import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';

import { EnvResponse } from '@/types/index';
import { getTemplateEnvs } from '@/utils/tools';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let user_namespace = '';

  const { insideCloud = 'false' } = req.query as { insideCloud: string };
  try {
    const { namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });
    user_namespace = namespace;
  } catch (error) {
    console.log(error, 'errpr-');
  }
  if (insideCloud === 'true' && !user_namespace) {
    return jsonRes(res, {
      code: 500,
      message: 'Namespace not found'
    });
  }

  jsonRes<EnvResponse>(res, {
    data: getTemplateEnvs(user_namespace)
  });
}
