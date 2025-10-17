import { initAppConfig } from '@/pages/api/platform/getAppConfig';
import {
  InvoiceBillingItem,
  InvoicePayload,
  InvoicesCollection,
  RechargeBillingItem,
  ReqGenInvoice
} from '@/types';
import { formatMoney } from '@/utils/format';

import axios from 'axios';
import { parseISO } from 'date-fns';
import { NextApiResponse } from 'next';
import { makeAPIClient } from './backend/region';
const feishuAxios = axios.create({
  baseURL: 'https://open.feishu.cn/open-apis',
  headers: {
    'Content-Type': 'application/json',
    'Accept-Encoding': 'gzip,deflate,compress'
  }
});
const getStatus = (invoiceStatus: InvoicePayload['status']) =>
  invoiceStatus === 'COMPLETED' ? '已完成' : '申请中';
export const updateTenantAccessToken = async () => {
  try {
    initAppConfig();
    const feishuConfig = global.AppConfig.costCenter.invoice.feishApp;

    const body = {
      app_id: feishuConfig.appId,
      app_secret: feishuConfig.appSecret
    };

    const res = await feishuAxios.post('/auth/v3/tenant_access_token/internal', body);
    const data = res.data;
    if (data.msg !== 'ok' || !data.tenant_access_token) return false;

    feishuAxios.defaults.headers.common['Authorization'] = 'Bearer ' + data.tenant_access_token;

    return true;
  } catch (error) {
    console.log(error);
    console.log('auth error');
    return false;
  }
};
const generateBotTemplate = ({
  invoice,
  payments
}: {
  invoice: Omit<InvoicePayload, 'remark' | 'updatedAt'>;
  payments: InvoiceBillingItem[];
}) => {
  const { contract, detail } = JSON.parse(invoice.detail) as InvoicesCollection;
  const invoiceDetail = [
    {
      invoiceKey: `用户`,
      invoiceValue: invoice.userID
    },
    {
      invoiceKey: `联系电话`,
      invoiceValue: contract.phone
    },
    {
      invoiceKey: `接收邮箱`,
      invoiceValue: contract.email
    },
    {
      invoiceKey: `发票抬头`,
      invoiceValue: detail.title
    },
    {
      invoiceKey: `发票类型`,
      invoiceValue: detail.type === 'special' ? '专票' : '普票'
    },
    {
      invoiceKey: `税号`,
      invoiceValue: detail.tax
    },
    {
      invoiceKey: `开户行`,
      invoiceValue: detail.bank
    },
    {
      invoiceKey: `银行账号`,
      invoiceValue: detail.bankAccount
    },
    {
      invoiceKey: `地址`,
      invoiceValue: detail.address || '-'
    },
    {
      invoiceKey: `电话`,
      invoiceValue: detail.phone || '-'
    },
    {
      invoiceKey: `传真`,
      invoiceValue: detail.fax || '-'
    },
    {
      invoiceKey: `总额`,
      invoiceValue: `￥${formatMoney(invoice.totalAmount)}`
    }
  ];
  const invoiceStatus: InvoicePayload['status'] = invoice.status;
  const invoiceAmount = formatMoney(invoice.totalAmount);
  const billingList = payments.map((v) => ({
    order_id: v.order_id,
    regionUID: v.regionUID,
    createdTime: parseISO(v.createdTime).getTime(),
    amount: formatMoney(v.amount)
  }));
  const card = {
    type: 'template',
    data: {
      template_id: AppConfig.costCenter.invoice.feishApp.template.id,
      template_version_name: AppConfig.costCenter.invoice.feishApp.template.version,
      template_variable: {
        invoiceId: invoice.id,
        invoiceDetail,
        invoiceStatus: getStatus(invoiceStatus),
        billingList,
        invoiceAmount,
        invoiceCreatedTime: invoice.createdAt,
        invoiceKv: invoiceDetail.reduce(
          (pre, { invoiceKey, invoiceValue }) => pre + `- ${invoiceKey}: ${invoiceValue}\n`,
          '\n'
        )
      }
    }
  };
  return card;
};
export const getInvoicePayments = async (invoiceID: string): Promise<RechargeBillingItem[]> => {
  try {
    const token = AppConfig.costCenter.invoice.serviceToken;
    if (!token) throw Error('token is null');
    const client = await makeAPIClient(null);
    const res = await client.post(`/account/v1alpha1/invoice/get-payment`, {
      token,
      invoiceID
    });
    const result = res.data;

    if (res.status !== 200) {
      console.log(result);
      return [];
    }

    return result.data || [];
  } catch (e) {
    console.log(e);
    return [];
  }
};
export const sendToBot = async ({
  invoiceDetail,
  payments
}: {
  invoiceDetail: {
    detail: ReqGenInvoice['detail'];
    contract: Omit<ReqGenInvoice['contract'], 'code'>;
  };
  payments: InvoiceBillingItem[];
}) => {
  // await updateTenantAccessToken()
  const card = generateBotTemplate({
    invoice: {
      detail: JSON.stringify(invoiceDetail),
      id: '-',
      status: 'PENDING',
      userID: '',
      createdAt: new Date(),
      totalAmount: 0
    },
    payments
  });

  const body = {
    msg_type: 'interactive',
    receive_id: AppConfig.costCenter.invoice.feishApp.chatId,
    content: JSON.stringify(card)
  };

  const result = await feishuAxios.post('/im/v1/messages?receive_id_type=chat_id', body, {
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json'
    }
  });
  const data = result.data;
  if (data.code === 0 && data.msg === 'success' && data?.data?.message_id) {
    return data.data.message_id as string;
  } else return '';
};
export const sendToUpdateBot = async ({
  invoice,
  payments,
  message_id
}: {
  invoice: Omit<InvoicePayload, 'remark' | 'updateAt'>;
  payments: InvoiceBillingItem[];
  message_id: string;
}) => {
  const card = generateBotTemplate({ invoice, payments });
  const body = {
    msg_type: 'interactive',
    receive_id: AppConfig.costCenter.invoice.feishApp.chatId,
    content: JSON.stringify(card)
  };

  const result = await feishuAxios.patch(`/im/v1/messages/${message_id}`, body, {
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json'
    }
  });
  const data = result.data;
  if (data.code !== 0 || data.msg !== 'success') {
    console.log(result);
    throw Error('update error');
  }
  return result.data;
};
export const sendToWithdrawBot = async ({ message_id }: { message_id: string }) => {
  const result = await feishuAxios.delete(`/im/v1/messages/${message_id}`, {
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json'
    }
  });
  const data = result.data;
  if (data.code !== 0 || data.msg !== 'success') {
    console.log(result);
    throw Error('delete error');
  }
  return result.data;
};
export const callbackToUpdateBot = async (
  res: NextApiResponse,
  {
    invoice,
    payments
  }: {
    invoice: InvoicePayload;
    payments: InvoiceBillingItem[];
  }
) => {
  const card = generateBotTemplate({ invoice, payments });
  return res.json({
    toast: {
      type: 'info',
      content: '状态变更成功',
      i18n: {
        zh_cn: '状态变更成功',
        en_us: 'card action success'
      }
    },
    card
  });
};
