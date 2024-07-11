import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { EnvResponse } from '@/types/index';
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
    data: {
      SEALOS_CLOUD_DOMAIN: process.env.SEALOS_CLOUD_DOMAIN || 'cloud.sealos.io',
      SEALOS_CERT_SECRET_NAME: process.env.SEALOS_CERT_SECRET_NAME || 'wildcard-cert',
      TEMPLATE_REPO_URL:
        process.env.TEMPLATE_REPO_URL || 'https://github.com/labring-actions/templates',
      SEALOS_NAMESPACE: user_namespace || '',
      SEALOS_SERVICE_ACCOUNT: user_namespace.replace('ns-', ''),
      SHOW_AUTHOR: process.env.SHOW_AUTHOR || 'false'
    }
  });
}
