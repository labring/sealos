import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/service/backend/response';
import { checkCode } from '@/service/backend/db/verifyCode';
import { addInvoice } from '@/service/backend/db/invoice';
import { ReqGenInvoice } from '@/types';
import { authSession } from '@/service/backend/auth';
import { sendToBot } from '@/service/sendToBot';
import {
  isValidBANKAccount,
  isValidCNTaxNumber,
  isValidEmail,
  isValidPhoneNumber,
  retrySerially
} from '@/utils/tools';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!global.AppConfig.costCenter.invoice.enabled) {
      throw new Error('invoice is not enabled');
    }
    const kc = await authSession(req.headers);

    // get user account payment amount
    const user = kc.getCurrentUser();
    if (user === null) {
      return jsonRes(res, { code: 401, message: 'user null' });
    }

    const { detail, contract, billings } = req.body as ReqGenInvoice;
    if (
      !detail ||
      !contract ||
      !billings ||
      !isValidPhoneNumber(contract.phone) ||
      !isValidCNTaxNumber(detail.tax) ||
      !isValidBANKAccount(detail.bankAccount) ||
      !isValidEmail(contract.email)
    ) {
      return jsonRes(res, {
        data: {
          status: false
        },
        message: 'The content is invalid',
        code: 400
      });
    }
    const url =
      global.AppConfig.costCenter.components.accountService.url +
      '/account/v1alpha1/payment/set-invoice';
    const setInvoiceRes = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        kubeConfig: kc.exportConfig(),
        owner: user.name,
        paymentIDList: billings.map((b) => b.ID)
      })
    });
    if (!setInvoiceRes.ok) throw Error('setInvocice error');
    if (
      process.env.NODE_ENV !== 'development' &&
      !(await checkCode({ phone: contract.phone, code: contract.code }))
    ) {
      return jsonRes(res, {
        data: {
          status: false
        },
        message: 'The code is wrong',
        code: 400
      });
    }
    if (!(billings.length > 0)) {
      return jsonRes(res, {
        data: {
          status: false
        },
        message: 'The amount of billing must more than 0',
        code: 400
      });
    }
    const document = {
      k8s_user: user.name,
      detail,
      contract,
      billings: billings.map((item) => ({
        order_id: item.ID,
        amount: item.Amount,
        regionUID: item.RegionUID,
        userUID: item.UserUID,
        createdTime: new Date(item.CreatedAt)
      }))
    };

    const result = await addInvoice(document);
    if (!result.acknowledged) {
      return jsonRes(res, {
        data: {
          status: false
        },
        message: 'update data error',
        code: 500
      });
    }
    await retrySerially(async () => {
      try {
        const result = await sendToBot(document);
        if (result.StatusCode !== 0) {
          throw new Error(result.msg);
        }
      } catch (error) {
        console.error(error);
      }
    }, 3);

    return jsonRes(res, {
      data: {
        status: true
      },
      code: 200,
      message: 'Invoice application successful'
    });
  } catch (error) {
    console.log(error);
    jsonRes(res, {
      data: {
        status: false
      },
      message: 'Failed to apply for the invoice.',
      code: 500
    });
  }
}
