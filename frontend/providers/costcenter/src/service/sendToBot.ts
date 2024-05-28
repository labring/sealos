import { Tbilling, TInvoiceContract, TInvoiceDetail } from '@/types';
import axios from 'axios';

export const sendToBot = async ({
  detail,
  contract,
  k8s_user,
  billings
}: {
  billings: Tbilling[];
  detail: TInvoiceDetail;
  contract: TInvoiceContract;
  k8s_user: string;
}) => {
  const body = JSON.stringify({
    msg_type: 'post',
    content: {
      post: {
        zh_cn: {
          title: '新的发票请求',
          content: [
            [
              {
                tag: 'text',
                text: '以下是联系方式:'
              }
            ],
            [
              {
                tag: 'text',
                text: `用户: ${k8s_user}, 电话: ${contract.phone}, `
              },
              {
                tag: 'text',
                text: `邮箱:${contract.email}`
              }
            ],
            [
              {
                tag: 'text',
                text: '以下是发票详情:'
              }
            ],
            [
              {
                tag: 'text',
                text: `发票抬头: ${detail.title}, `
              },
              {
                tag: 'text',
                text: `税号: ${detail.tax}, `
              },
              {
                tag: 'text',
                text: `开户行: ${detail.bank}, `
              },
              {
                tag: 'text',
                text: `银行账号: ${detail.bankAccount}, `
              },
              {
                tag: 'text',
                text: `地址: ${detail.address || '-'}, `
              },
              {
                tag: 'text',
                text: `电话: ${detail.phone || '-'}, `
              },
              {
                tag: 'text',
                text: `传真: ${detail.fax || '-'}, `
              },
              {
                tag: 'text',
                text: `总额: ￥${billings.reduce((pre, cur) => pre + cur.amount, 0)}`
              }
            ],
            [
              {
                tag: 'text',
                text: '以下是所有消费记录:'
              }
            ],
            ...billings.map((item) => [
              {
                tag: 'text',
                text: `订单号: ${item.order_id}, 创建时间: ${item.createdTime}, 金额: ￥${item.amount}, 可用区UID: ${item.regionUID}, 用户UID ${item.userUID}`
              }
            ])
          ]
        }
      }
    }
  });
  console.log(body);
  const url = global.AppConfig.costCenter.invoice.feiShuBotURL;
  console.log(url);
  const result = await axios.post(url, body, {
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json'
    }
  });
  return result.data;
};
