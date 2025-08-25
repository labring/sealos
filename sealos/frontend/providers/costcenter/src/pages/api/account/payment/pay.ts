import { paymentMeta } from '@/constants/payment';
import { authSession } from '@/service/backend/auth';
import { GetCRD, GetUserDefaultNameSpace } from '@/service/backend/kubernetes';
import { jsonRes } from '@/service/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    if (!global.AppConfig.costCenter.recharge.enabled) {
      throw new Error('recharge is not enabled');
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

    const paymentM = {
      ...paymentMeta,
      namespace: GetUserDefaultNameSpace(kube_user.name)
    };
    const paymentDesc = await GetCRD(kc, paymentM, id);
    //@ts-ignore
    if (paymentDesc?.body?.status) {
      // @ts-ignore
      const paymentStatusResp = paymentDesc.body.status as paymentStatus;
      return jsonRes(resp, { data: paymentStatusResp });
    } else {
      throw new Error('payment not found');
    }
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'pay error' });
  }
}
