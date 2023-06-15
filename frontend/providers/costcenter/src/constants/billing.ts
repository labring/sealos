export const TableHeaders = [
  'Order Number',
  'Transaction Time',
  'Type',
  'CPU',
  'Memory',
  'Local Disk',
  'Total Amount'
];
export const CATEGORY = ['CPU', 'Memory', 'Local Disk'];
export const INITAL_SOURCE = [['date', 'cpu', 'memory', 'storage', 'amount']] as const;
export const LIST_TYPE: { title: string; value: -1 | 0 | 1 }[] = [
  { title: 'All', value: -1 },
  { title: 'Deduction', value: 0 },
  { title: 'Charge', value: 1 }
];
