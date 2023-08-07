import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
export type Response = {
  domain?: string;
  env_storage_className?: string;
};
export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    jsonRes<Response>(res, {
      data: {
        domain: process.env.SEALOS_DOMAIN || 'cloud.sealos.io',
        env_storage_className: process.env.STORAGE_CLASSNAME
      }
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
