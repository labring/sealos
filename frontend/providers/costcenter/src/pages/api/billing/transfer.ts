import { authSession } from '@/service/backend/auth';
import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/service/backend/response';
import { GetUserDefaultNameSpace } from '@/service/backend/kubernetes';
import { BillingData, BillingSpec, RechargeBillingData, TransferType } from '@/types';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const kc = await authSession(req.headers);
    // get user account payment amount
    const user = kc.getCurrentUser();
    if (user === null) {
      return jsonRes(resp, { code: 403, message: 'user null' });
    }
    const {
      endTime,
      startTime,
      type = 0,
      orderID
    } = req.body as {
      endTime?: Date;
      orderID?: string;
      startTime?: Date;
      type?: TransferType;
    };
    if (!endTime)
      return jsonRes(resp, {
        code: 400,
        message: 'endTime is invalid'
      });
    if (!startTime)
      return jsonRes(resp, {
        code: 400,
        message: 'endTime is invalid'
      });
    const data = {
      kubeConfig: kc.exportConfig(),
      owner: user.name,
      startTime,
      transferID: orderID,
      endTime,
      type
    };

    const url =
      global.AppConfig.costCenter.components.accountService.url + '/account/v1alpha1/get-transfer';
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (!response.clone().ok)
      return jsonRes(resp, {
        data: {
          transfer: [],
          totalPage: 0,
          pageSize: 0
        }
      });
    const res = await response.clone().json();
    return jsonRes(resp, {
      data: res.data
    });
  } catch (error) {
    jsonRes(resp, { code: 500, message: 'get billing error' });
  }
}
