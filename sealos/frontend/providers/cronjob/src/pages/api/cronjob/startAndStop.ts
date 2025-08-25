import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import * as k8s from '@kubernetes/client-node';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { jobName, type } = req.body;
    const { namespace, k8sBatch } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const options = { headers: { 'Content-type': k8s.PatchUtils.PATCH_FORMAT_JSON_PATCH } };

    const patch = [{ op: 'replace', path: '/spec/suspend', value: type === 'Stop' ? true : false }];

    const response: any = await k8sBatch.patchNamespacedCronJob(
      jobName,
      namespace,
      patch,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      options
    );

    jsonRes(res, { data: response?.body?.items });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
