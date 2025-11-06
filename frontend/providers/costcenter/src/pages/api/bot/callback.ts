import { makeAPIClient } from '@/service/backend/region';
import {
  callbackToUpdateBot,
  getInvoicePayments,
  sendInvoiceCompletedSMS,
  updateTenantAccessToken
} from '@/service/sendToBot';
import { InvoiceListData, InvoicePayload, InvoicesCollection } from '@/types';
import type { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    await updateTenantAccessToken();
    const body = req.body as {
      type?: 'url_verification';
    };
    if (body.type === 'url_verification') {
      const { token, challenge } = body as {
        challenge?: string;
        token?: string;
      };
      if (!token || !challenge) {
        throw Error('');
      }

      // !todo
      if (token === global.AppConfig.costCenter.invoice.feishApp.token) {
        return resp.json({ challenge });
      }
    } else {
      const { event, header, schema } = body as {
        schema: '2.0';
        header: {
          event_id: string;
          token: string;
          create_time: string;
          event_type: 'card.action.trigger';
          tenant_key: string;
          app_id: string;
        };
        event?: {
          token: string;
          action: {
            value: {
              status: '1' | '0';
              id: string; // invoiceId
            };
          };
        };
      };
      // !todo verify
      if (
        !event ||
        schema !== '2.0' ||
        !header ||
        header.token !== global.AppConfig.costCenter.invoice.feishApp.token ||
        header.app_id !== global.AppConfig.costCenter.invoice.feishApp.appId
      ) {
        throw Error('feishu request error');
      }
      const value = event.action.value;

      // const url = makeAPIURL(null, '/account/v1alpha1/invoice/set-status')
      let status: InvoicePayload['status'] = 'PENDING';
      if (value.status === '1') {
        status = 'COMPLETED';
      } else if (value.status === '0') {
        status = 'PENDING';
      } else {
        throw Error('');
      }
      const invoiceId = value.id;
      if (!invoiceId) {
        throw Error(`invoiceId is null`);
      }
      if (!(await updateTenantAccessToken())) throw Error('updateTenantAccessToken error');
      // const url = makeAPIClient(null, '/account/v1alpha1/invoice/set-status');
      const client = await makeAPIClient(null);
      if (!client) return;
      const setStatusRes = await client.post('/account/v1alpha1/invoice/set-status', {
        invoiceIDList: [invoiceId],
        status,
        token: AppConfig.costCenter.invoice.serviceToken
      });
      if (setStatusRes.status !== 200) {
        console.log(setStatusRes.data);
        throw Error('set invoice status error');
      }

      // const getUrl = makeAPIClient(null, '/account/v1alpha1/invoice/get');
      const getInvoiceRes = await client.post('/account/v1alpha1/invoice/get', {
        token: AppConfig.costCenter.invoice.serviceToken,
        invoiceID: invoiceId,
        page: 1,
        pageSize: 10,
        startTime: '2023-01-01T00:00:00Z',
        endTime: new Date()
      });
      const invoiceListData = getInvoiceRes.data as {
        data: InvoiceListData;
      };
      const payments = await getInvoicePayments(invoiceId);

      if (status === 'COMPLETED') {
        const invoice = invoiceListData.data.invoices[0];
        try {
          const invoiceDetail = JSON.parse(invoice.detail) as InvoicesCollection;
          const { contract } = invoiceDetail;
          if (contract && contract.phone) {
            sendInvoiceCompletedSMS({
              phone: contract.phone,
              invoiceId: invoice.id
            });
          }
        } catch (err) {
          console.log('Failed to parse invoice detail for SMS:', err, {
            invoiceId: invoice.id,
            detail: invoice.detail
          });
        }
      }
      return callbackToUpdateBot(resp, {
        invoice: invoiceListData.data.invoices[0],
        // [FIXME] Use `InvoiceBillingItem` under ANY circumstances! `RechargeBillingItem` is used for API only.
        payments: payments as any,
        status
      });
    }
  } catch (error) {
    console.log(error);
    return resp.json('error');
  }
}
