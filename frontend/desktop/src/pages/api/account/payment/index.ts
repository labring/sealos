import { generatePaymentCrd, PaymentForm } from '@/types';
import { authSession } from '@/services/backend/auth';
import { ApplyYaml, GetUserDefaultNameSpace } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import crypto from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { enableRecharge } from '@/services/enable';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    if(!enableRecharge()){
      throw new Error('Recharge is not enabled');
    }
    if (req.method !== 'POST') {
      return jsonRes(resp, { code: 405 });
    }
    const { amount } = req.body;
    const kc = await authSession(req.headers);

    if (!kc || amount <= 0) {
      return jsonRes(resp, {
        code: 400,
        message: 'Amount cannot be less than 0'
      });
    }

    const kubeUser = kc.getCurrentUser();
    if (kubeUser === null) {
      return jsonRes(resp, { code: 401, message: 'user not found' });
    }

    // do payment
    const paymentName = crypto.randomUUID();
    const namespace = GetUserDefaultNameSpace(kubeUser.name);
    const form: PaymentForm = {
      namespace,
      paymentName,
      userId: kubeUser.name,
      amount
    };

    const paymentCrd = generatePaymentCrd(form);
    const res = await ApplyYaml(kc, paymentCrd);

    return jsonRes(resp, {
      data: {
        paymentName: paymentName,
        extra: res[0]
      }
    });
  } catch (error) {
    jsonRes(resp, { code: 500, data: error });
  }
}
