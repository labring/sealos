import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  jsonRes(res, {
    data: {
      SEALOS_CLOUD_DOMAIN: process.env.SEALOS_CLOUD_DOMAIN || 'cloud.sealos.io',
      SEALOS_CERT_SECRET_NAME: process.env.SEALOS_CERT_SECRET_NAME || 'wildcard-cert',
      TEMPLATE_REPO_URL:
        process.env.TEMPLATE_REPO_URL || 'https://github.com/labring-actions/templates'
    }
  });
}
