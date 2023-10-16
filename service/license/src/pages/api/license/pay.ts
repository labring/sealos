import { authSession } from '@/services/backend/auth';
import { ApplyYaml } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import { LicensePaymentForm } from '@/types';
import yaml from 'js-yaml';
import type { NextApiRequest, NextApiResponse } from 'next';

export const generateLicenseCrd = (form: LicensePaymentForm) => {
  const paymentCrd = {
    apiVersion: 'infostream.sealos.io/v1',
    kind: 'Payment',
    metadata: {
      name: form.paymentName,
      namespace: form.namespace
    },
    spec: {
      userID: form.userId,
      amount: form.amount, // weixin
      paymentMethod: form.paymentMethod,
      service: {
        amt: form.quota, // Actual value
        hid: form.hashID,
        typ: 'account'
      }
    }
  };
  try {
    const result = yaml.dump(paymentCrd);
    return result;
  } catch (error) {
    throw error;
  }
};

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const payload = await authSession(req.headers);
    if (!payload) return jsonRes(resp, { code: 401, message: 'token verify error' });

    const { amount, paymentMethod, hid, quota } = req.body as {
      amount: number;
      paymentMethod: 'wechat' | 'stripe';
      hid: string;
      quota: number;
    };
    console.log(amount, quota, paymentMethod, hid);
    if (!hid) {
      return jsonRes(resp, {
        code: 400,
        message: 'Missing hid parameter'
      });
    }
    if (amount <= 0) {
      return jsonRes(resp, {
        code: 400,
        message: 'Amount cannot be less than 0'
      });
    }

    const paymentName = crypto.randomUUID();
    const form: LicensePaymentForm = {
      namespace: payload.user.nsid,
      paymentName: paymentName,
      userId: payload.user.k8s_username,
      amount: amount,
      quota: quota,
      paymentMethod: paymentMethod,
      hashID: hid
    };

    const LicenseCrd = generateLicenseCrd(form);

    const res = await ApplyYaml(payload.kc, LicenseCrd);
    return jsonRes(resp, {
      data: {
        paymentName: paymentName,
        extra: res[0]
      }
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, data: error });
  }
}
