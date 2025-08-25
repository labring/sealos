import * as yaml from 'js-yaml';
import { CRDMeta } from './crd';

export type PaymentForm = {
  paymentName: string;
  namespace: string;
  userId: string;
  amount: string;
};

export const paymentMeta: CRDMeta = {
  group: 'account.sealos.io',
  version: 'v1',
  namespace: 'sealos-system',
  plural: 'payments'
};

export type Payment = {
  paymentName: string;
  extra: {
    apiVersion: 'account.sealos.io/v1';
    kind: 'Payment';
    metadata: unknown;
    spec: {
      amount: number;
      paymentMethod: string;
      userID: string;
    };
  };
};
export type Pay = {
  codeURL: string;
  status?: 'Created' | 'SUCCESS';
  tradeNO: string;
};

export const generatePaymentCrd = (form: PaymentForm) => {
  const paymentCrd = {
    apiVersion: 'account.sealos.io/v1',
    kind: 'Payment',
    metadata: {
      name: form.paymentName,
      namespace: form.namespace
    },
    spec: {
      userID: form.userId,
      amount: form.amount,
      paymentMethod: 'wechat'
    }
  };

  try {
    const result = yaml.dump(paymentCrd);
    return result;
  } catch (error) {
    return '';
  }
};
