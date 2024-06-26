import { generatePaymentCrd, PaymentForm } from '@/constants/payment';
import { authSession } from '@/service/backend/auth';
import { ApplyYaml, GetUserDefaultNameSpace } from '@/service/backend/kubernetes';
import { jsonRes } from '@/service/backend/response';
import crypto from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    if (!global.AppConfig.costCenter.recharge.enabled) {
      throw new Error('recharge is not enabled');
    }
    if (req.method !== 'POST') {
      return jsonRes(resp, { code: 405 });
    }
    const { amount, paymentMethod } = req.body;
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
      amount,
      paymentMethod
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
    console.log(error);
    jsonRes(resp, { code: 500, message: 'pay error' });
  }
}
