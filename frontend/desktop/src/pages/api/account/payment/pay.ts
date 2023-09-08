import { paymentMeta } from '@/types';
import { authSession } from '@/services/backend/auth';
import { GetCRD, GetUserDefaultNameSpace } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
import { enableRecharge } from '@/services/enable';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    if (!enableRecharge()) {
      throw new Error('Recharge is not enabled');
    }
    const payload = await authSession(req.headers);
    if (!payload) return jsonRes(resp, { code: 401, message: 'token verify error' });
    const kc = payload.kc;
    const { id } = req.query;

    if (typeof id !== 'string' || id === '') {
      return jsonRes(resp, { code: 400, message: 'Id cannot be empty' });
    }

    // get payment crd
    type paymentStatus = {
      tradeNo: string;
      codeURL: string;
      status: string;
    };
    const k8s_username = payload.user.k8s_username;
    const paymentM = { ...paymentMeta, namespace: GetUserDefaultNameSpace(k8s_username) };
    const paymentDesc = await GetCRD(kc, paymentM, id);

    if (paymentDesc?.body?.status) {
      const paymentStatusResp = paymentDesc.body.status as paymentStatus;
      return jsonRes(resp, { data: paymentStatusResp });
    }
  } catch (error) {
    jsonRes(resp, { code: 500, data: error });
  }
}
