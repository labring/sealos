import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/service/backend/response';
import { checkCode } from '@/service/backend/db/verifyCode';
import { InvoicePayload, RechargeBillingItem, ReqGenInvoice } from '@/types';
import { authSession } from '@/service/backend/auth';
import {
  getInvoicePayments,
  sendToBot,
  sendToUpdateBot,
  sendToWithdrawBot,
  updateTenantAccessToken
} from '@/service/sendToBot';
import {
  isValidBANKAccount,
  isValidCNTaxNumber,
  isValidEmail,
  isValidPhoneNumber,
  retrySerially
} from '@/utils/tools';
import { makeAPIURL } from '@/service/backend/region';
import { AxiosError } from 'axios';

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
    await updateTenantAccessToken();
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
    const invoiceDetail: {
      detail: ReqGenInvoice['detail'];
      contract: Omit<ReqGenInvoice['contract'], 'code'>;
    } = {
      detail,
      contract: {
        person: contract.person,
        phone: contract.phone,
        email: contract.email
      }
    };
    const bodyRaw = {
      kubeConfig: kc.exportConfig(),
      paymentIDList: billings.map((item) => item.ID),
      detail: JSON.stringify(invoiceDetail)
    };
    const message_id = await retrySerially<string>(()=>sendToBot({
      invoiceDetail,
      payments: billings
    }), 3) as string;
    if (!message_id) {
      console.log('sendMessage Error');
      throw Error('');
    }
    const url = makeAPIURL(null, '/account/v1alpha1/invoice/apply');
    const result = await fetch(url, {
      method: 'post',
      body: JSON.stringify(bodyRaw)
    });
    const invoiceRes = (await result.json()) as {
      data: {
        invoice: InvoicePayload;
        payments: RechargeBillingItem[];
      };
    };
    if (!result.ok) {
      console.log(invoiceRes);
      await sendToWithdrawBot({ message_id });
      if (result.status === 403)
        return jsonRes(res, {
          message: 'You have no permission to apply for the invoice.',
          data: {
            status: false
          },
          code: 403
        });
      else if (result.status === 500) {
        throw new Error('Failed to apply for the invoice.');
      }
    }
		
    const invoice = invoiceRes.data.invoice;
    const payments = await getInvoicePayments(invoice.id);
    const botResult = await sendToUpdateBot({
      invoice,
      payments,
      message_id
    });
    if (!botResult) throw Error('botResult is null');

    return jsonRes(res, {
      data: {
        status: true
      },
      code: 200,
      message: 'Invoice application successful'
    });
  } catch (error) {
    console.log(error);
    return jsonRes(res, {
      data: {
        status: false
      },
      message: 'Failed to apply for the invoice.',
      code: 500
    });
  }
}
