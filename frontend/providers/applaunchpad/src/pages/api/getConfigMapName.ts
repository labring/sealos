import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';

export const NODE_TLS_REJECT_UNAUTHORIZED = 0;

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    jsonRes(res, {
      data: {
        configmapName: process.env.GLOBAL_CONFIGMAP_NAME || '',
        mountPath: process.env.GLOBAL_CONFIGMAP_PATH || ''
      }
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
