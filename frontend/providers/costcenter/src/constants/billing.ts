import { BillingType, TransferType } from '@/types';

export const BasicTableHeaders = ['Order Number', 'Transaction Time', 'APP Type'] as const;
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
export const TRANSFER_LIST_TYPE: { title: string; value: TransferType }[] = [
  { title: 'All', value: TransferType.ALL },
  { title: 'Recipient', value: TransferType.RECEIVE },
  { title: 'Transfer', value: TransferType.TRANSFER }
];
export enum TableHeaderID {
  'APPName' = 'APP Name',
  'OrderNumber' = 'Order Number',
  'TransactionTime' = 'Transaction Time',
  'APPType' = 'APP Type',
  'CPU' = 'CPU',
  'GPU' = 'GPU',
  'Port' = 'Port',
  'TrueAmount' = 'True Amount',
  'Memory' = 'Memory',
  'Storage' = 'Storage',
  'Network' = 'Network',
  'TotalAmount' = 'Total Amount',
  'Handle' = 'Handle',
  'Namespace' = 'Namespace',
  'TransferType' = 'Transfer Type',
  'TraderID' = 'Trader ID'
}
