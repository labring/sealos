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
  'CPUAmount' = 'CPU Amount',
  'GPU' = 'GPU',
  'Port' = 'Port',
  'PortAmount' = 'Port Amount',
  'TrueAmount' = 'True Amount',
  'Memory' = 'Memory',
  'MemoryAmount' = 'Memory Amount',
  'Storage' = 'Storage',
  'StorageAmount' = 'Storage Amount',
  'Network' = 'Network',
  'NetworkAmount' = 'Network Amount',
  'TotalAmount' = 'Total Amount',
  'Handle' = 'Handle',
  'Region' = 'Region',
  'Namespace' = 'workspace',
  'TransferType' = 'Transfer Type',
  'TraderID' = 'Trader ID',
  'Status' = 'Invoice Status',
  'InvoiceCreateTime' = 'Invoice Create Time',
  'InvoiceUpdateTime' = 'Invoice Update Time',
  'GPUAmount' = 'GPU Amount'
}

export const resourceType = ['cpu', 'memory', 'storage', 'network', 'nodeports', 'gpu'] as const;
