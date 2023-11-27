import * as yaml from 'js-yaml';
import { CRDMeta } from '@/types/crd';
import { endOfDay, getMonth, getYear } from 'date-fns';
export type PaymentForm = {
  paymentName: string;
  namespace: string;
  userId: string;
  amount: string;
  paymentMethod: 'wechat' | 'stripe';
};

export const paymentMeta: CRDMeta = {
  group: 'account.sealos.io',
  version: 'v1',
  namespace: 'sealos-system',
  plural: 'payments'
};

export type PaymentResp = {
  payment_name: string;
  extra?: any;
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
      paymentMethod: form.paymentMethod
    }
  };

  try {
    const result = yaml.dump(paymentCrd);
    return result;
  } catch (error) {
    return '';
  }
};

export const generateTransferCrd = ({
  to,
  from,
  amount,
  namespace,
  name
}: {
  to: string;
  from: string;
  amount: number;
  namespace: string;
  name: string;
}) => {
  const TransferCrd = {
    apiVersion: 'account.sealos.io/v1',
    kind: 'Transfer',
    metadata: {
      name,
      namespace
    },
    spec: {
      to,
      amount,
      from
    }
  };

  try {
    const result = yaml.dump(TransferCrd);
    return result;
  } catch (error) {
    return '';
  }
};

// years mock data
export const INIT_YEAR = 2022;
export const CURRENT_MONTH = '本月';
export const NOW_YEAR = getYear(new Date());
export const NOW_MONTH = getMonth(new Date());
export const NOW_WEEK = 0;
export const START_TIME = new Date(2023, 0, 1);
export const END_TIME = endOfDay(new Date());
export const valuationMap = new Map([
  ['cpu', { unit: 'Core', scale: 1000, bg: '#33BABB', idx: 0 }],
  ['memory', { unit: 'GB', scale: 1024, bg: '#36ADEF', idx: 1 }],
  ['storage', { unit: 'GB', scale: 1024, bg: '#9A8EE0', idx: 2 }],
  ['gpu', { unit: 'GPU', scale: 1000, bg: '#6FCA88', idx: 3 }],
  ['network', { unit: 'M', scale: 1, bg: '#F182AA', idx: 4 }],
  ['services.nodeports', { unit: '', scale: 1, bg: '#F182AA', idx: 4 }]
]);
