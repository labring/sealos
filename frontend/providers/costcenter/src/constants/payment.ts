import { CRDMeta } from '@/types/crd';
import { endOfDay, getMonth, getYear } from 'date-fns';
import * as yaml from 'js-yaml';
import { CircuitBoard, Cpu, HardDrive, HdmiPort, MemoryStick, Network } from 'lucide-react';
export type PaymentForm = {
  paymentName: string;
  namespace: string;
  userId: string;
  amount: string;
  paymentMethod: 'wechat' | 'alipay' | 'stripe';
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
  [
    'cpu',
    {
      icon: Cpu,
      unit: 'Core',
      scale: 1000,
      idx: 0
    }
  ],
  [
    'memory',
    {
      icon: MemoryStick,
      unit: 'GB',
      scale: 1024,
      idx: 1
    }
  ],
  [
    'storage',
    {
      icon: HardDrive,
      unit: 'GB',
      scale: 1024,
      idx: 2
    }
  ],
  [
    'gpu',
    {
      icon: HdmiPort,
      unit: 'GPU Unit',
      scale: 1,
      idx: 3
    }
  ],
  [
    'network',
    {
      icon: Network,
      unit: 'M',
      scale: 1,
      idx: 4
    }
  ],
  [
    'nodeport',
    {
      icon: CircuitBoard,
      unit: 'port_unit',
      scale: 1,
      idx: 5
    }
  ],
  [
    'traffic',
    {
      icon: Network,
      unit: 'GB',
      scale: 1024,
      idx: 6
    }
  ]
] as const);
