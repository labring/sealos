import { generatePaymentCrd, generateTransferCrd } from '@/constants/payment';
import { authSession } from '@/service/backend/auth';
import {
  ApplyYaml,
  GetUserDefaultNameSpace,
  watchClusterObject
} from '@/service/backend/kubernetes';
import { jsonRes } from '@/service/backend/response';
import { enableTransfer } from '@/service/enabled';
import { TransferState } from '@/types/Transfer';
import { getTime } from 'date-fns';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    if (!enableTransfer()) {
      throw new Error('transfer is not enabled');
    }
    if (req.method !== 'POST') {
      return jsonRes(resp, { code: 405 });
    }
    const { amount, to } = req.body;
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

    const namespace = GetUserDefaultNameSpace(kubeUser.name);
    const name = to + '-' + getTime(new Date());
    const transferCRD = generateTransferCrd({
      to,
      amount,
      namespace,
      name,
      from: kubeUser.name
    });
    await ApplyYaml(kc, transferCRD);
    const body = (await watchClusterObject({
      kc,
      namespace,
      group: 'account.sealos.io',
      version: 'v1',
      plural: 'transfers',
      name,
      CompareFn(a, b) {
        let status = [2, 3].includes(b?.status.progress);
        return status;
      }
    })) as {
      status: {
        progress: TransferState;
        reason: string;
      };
    };
    if (body.status.progress === TransferState.TransferStateFailed) {
      return jsonRes(resp, {
        data: body,
        code: 400,
        message: 'transfer failed'
      });
    }
    return jsonRes(resp, {
      code: 200,
      message: 'transfer success',
      data: body
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'transfer error' });
  }
}
