import { HttpError } from '@kubernetes/client-node';
import type { NextApiRequest, NextApiResponse } from 'next';
import { paymentMeta } from '../../../../../mock/user';
import { GetCRD, K8sApi } from '../../../../../services/backend/kubernetes';
import { BadRequestResp, InternalErrorResp, JsonResp, UnprocessableResp } from '../../../response';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  if (req.method !== 'POST') {
    return BadRequestResp(resp);
  }

  const { kubeconfig } = req.body;
  const { name } = req.query;
  if (kubeconfig === '' || typeof name !== 'string' || name === '') {
    return UnprocessableResp('kubeconfig or name', resp);
  }

  const kc = K8sApi(kubeconfig);

  const kube_user = kc.getCurrentUser();
  if (kube_user === null) {
    return BadRequestResp(resp);
  }

  // get payment crd

  type paymentStatus = {
    tradeNo: string;
    codeURL: string;
    status: string;
  };

  try {
    const paymentDesc = await GetCRD(kc, paymentMeta, name);
    if (paymentDesc !== null && paymentDesc.body !== null && paymentDesc.body.status !== null) {
      const paymentStatusResp = paymentDesc.body.status as paymentStatus;
      return JsonResp(paymentStatusResp, resp);
    }
  } catch (err) {
    console.log(err);

    if (err instanceof HttpError) {
      return InternalErrorResp(err.body, resp);
    }
  }

  return InternalErrorResp('get payment failed', resp);
}
