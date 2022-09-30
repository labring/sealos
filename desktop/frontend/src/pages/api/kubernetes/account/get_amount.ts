import * as k8s from '@kubernetes/client-node';
import type { NextApiRequest, NextApiResponse } from 'next';
import { CRDMeta, GetCRD, K8sApi } from '../../../../services/backend/kubernetes';
import { BadRequestResp, InternalErrorResp, JsonResp, UnprocessableResp } from '../../response';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  if (req.method !== 'POST') {
    return BadRequestResp(resp);
  }

  const { kubeconfig } = req.body;
  // console.log(req.body);
  if (kubeconfig === '') {
    return UnprocessableResp('kubeconfig or user', resp);
  }

  const kc = K8sApi(kubeconfig);

  // get user account payment amount

  const user = kc.getCurrentUser();
  if (user === null) {
    return BadRequestResp(resp);
  }

  const account_meta: CRDMeta = {
    group: 'user.sealos.io',
    version: 'v1',
    namespace: 'sealos-system',
    plural: 'accounts'
  };

  type accountStatus = {
    balance: number;
  };

  try {
    const accountDesc = await GetCRD(kc, account_meta, user.name);
    if (accountDesc !== null && accountDesc.body !== null && accountDesc.body.status !== null) {
      const accountStatus = accountDesc.body.status as accountStatus;
      return JsonResp(accountStatus, resp);
    }
  } catch (err) {
    console.log(err);

    if (err instanceof k8s.HttpError) {
      return InternalErrorResp(err.body.message, resp);
    }
  }

  return InternalErrorResp('get amount failed', resp);
}
