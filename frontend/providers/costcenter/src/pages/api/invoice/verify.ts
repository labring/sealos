import { checkCode } from '@/service/backend/db/verifyCode';
import { makeAPIClientByHeader } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import {
  getInvoicePayments,
  sendToBot,
  sendToUpdateBot,
  sendToWithdrawBot,
  updateTenantAccessToken
} from '@/service/sendToBot';
import { InvoicePayload, RechargeBillingItem, ReqGenInvoice } from '@/types';
import {
  isValidBANKAccount,
  isValidCNTaxNumber,
  isValidEmail,
  isValidPhoneNumber,
  retrySerially
} from '@/utils/tools';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!global.AppConfig.costCenter.invoice.enabled) {
      throw new Error('invoice is not enabled');
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
      // kubeConfig: kc.exportConfig(),
      billings,
      detail: JSON.stringify(invoiceDetail)
    };
    const message_id = (await retrySerially<string>(
      () =>
        sendToBot({
          invoiceDetail,
          payments: billings
        }),
      3
    )) as string;
    if (!message_id) {
      console.log('sendMessage Error');
      throw Error('');
    }
    const client = await makeAPIClientByHeader(req, res);
    if (!client) return;

    const result = await client.post('/account/v1alpha1/invoice/apply', bodyRaw);
    const invoiceRes = result.data as {
      data: {
        invoice: InvoicePayload;
        payments: RechargeBillingItem[];
      };
    };
    if (result.status !== 200) {
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
    const paymentItems = payments.map((payment) => ({
      order_id: payment.ID,
      amount: payment.Amount,
      regionUID: payment.RegionUID,
      createdTime: payment.CreatedAt
    }));
    const botResult = await sendToUpdateBot({
      invoice,
      payments: paymentItems,
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
