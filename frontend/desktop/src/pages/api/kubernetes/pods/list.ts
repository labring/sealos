import * as k8s from '@kubernetes/client-node';
import type { NextApiRequest, NextApiResponse } from 'next';
import { GetUserDefaultNameSpace, K8sApi, ListPods } from '../../../../services/backend/kubernetes';
import { BadRequestResp, InternalErrorResp, JsonResp, UnprocessableResp } from '../../response';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  if (req.method !== 'POST') {
    return BadRequestResp(resp);
  }

  const { kubeconfig } = req.body;
  if (kubeconfig === '') {
    return UnprocessableResp('kubeconfig or user', resp);
  }

  const kc = K8sApi(kubeconfig);

  const user = kc.getCurrentUser();
  if (user === null) {
    return BadRequestResp(resp);
  }

  const ns = GetUserDefaultNameSpace(user.name);

  try {
    const pods = await ListPods(kc, ns);
    return JsonResp(pods.body, resp);
  } catch (err) {
    console.log(err);

    if (err instanceof k8s.HttpError) {
      return InternalErrorResp(err.body.message, resp);
    }
  }

  return InternalErrorResp('list pods failed', resp);
}
