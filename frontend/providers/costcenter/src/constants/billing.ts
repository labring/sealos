export const TableHeaders = [
  'Order Number',
  'Transaction Time',
  'Type',
  'CPU',
  'Memory',
  'Storage'
  // 'GPU',
  // 'Total Amount'
] as const;

export const InvoiceTableHeaders = ['Order Number', 'Transaction Time', 'True Amount'] as const;
export const CATEGORY = ['CPU', 'Memory', 'Local Disk'];
export const INITAL_SOURCE = [['date', 'cpu', 'memory', 'storage', 'amount']] as const;
export const LIST_TYPE: { title: string; value: -1 | 0 | 1 | 2 | 3 }[] = [
  { title: 'All', value: -1 },
  { title: 'Deduction', value: 0 },
  { title: 'Charge', value: 1 },
  { title: 'Recipient', value: 2 },
  { title: 'Transfer', value: 3 }
];
