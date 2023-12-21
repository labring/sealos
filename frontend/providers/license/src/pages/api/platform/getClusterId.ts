import { authSession } from '@/services/backend/auth';
import { K8sApiDefault, getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import * as k8s from '@kubernetes/client-node';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const defaultKc = K8sApiDefault();

    const result = await defaultKc.makeApiClient(k8s.CoreV1Api).readNamespace('kube-system');

    const systemId = result?.body?.metadata?.uid?.substring(0, 8);

    jsonRes(res, {
      data: {
        systemId: systemId
      }
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
