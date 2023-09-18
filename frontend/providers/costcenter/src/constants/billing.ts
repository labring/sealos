import { BillingType } from '@/types';

export const BasicTableHeaders = ['Order Number', 'Transaction Time', 'Type'] as const;
export const InvoiceTableHeaders = ['Order Number', 'Transaction Time', 'True Amount'] as const;
export const CATEGORY = ['CPU', 'Memory', 'Storage', 'Network'] as const;
export const TableHeaders = [
  'CPU',
  'Memory',
  'Storage',
  'Network'
  // 'GPU',
  // 'Total Amount'
] as const;
export const INITAL_SOURCE = [['date', 'cpu', 'memory', 'storage', 'network', 'amount']] as const;
export const LIST_TYPE: { title: string; value: BillingType }[] = [
  { title: 'All', value: BillingType.ALL },
  { title: 'Deduction', value: BillingType.CONSUME },
  { title: 'Charge', value: BillingType.RECHARGE },
  { title: 'Recipient', value: BillingType.RECEIVE },
  { title: 'Transfer', value: BillingType.TRANSFER }
];
