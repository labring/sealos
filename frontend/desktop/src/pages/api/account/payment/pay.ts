import { paymentMeta } from '@/types';
import { authSession } from '@/services/backend/auth';
import { GetCRD, GetUserDefaultNameSpace } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
import { enableRecharge } from '@/services/enable';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    if(!enableRecharge()){
      throw new Error('Recharge is not enabled');
    }
    const kc = await authSession(req.headers);
    const { id } = req.query;

    if (typeof id !== 'string' || id === '') {
      return jsonRes(resp, { code: 404, message: 'Id cannot be empty' });
    }

    const kube_user = kc.getCurrentUser();
    if (kube_user === null) {
      return jsonRes(resp, { code: 404, message: 'user not found' });
    }

    // get payment crd
    type paymentStatus = {
      tradeNo: string;
      codeURL: string;
      status: string;
    };

    const paymentM = { ...paymentMeta, namespace: GetUserDefaultNameSpace(kube_user.name) };
    const paymentDesc = await GetCRD(kc, paymentM, id);

    if (paymentDesc?.body?.status) {
      const paymentStatusResp = paymentDesc.body.status as paymentStatus;
      return jsonRes(resp, { data: paymentStatusResp });
    }
  } catch (error) {
    jsonRes(resp, { code: 500, data: error });
  }
}
