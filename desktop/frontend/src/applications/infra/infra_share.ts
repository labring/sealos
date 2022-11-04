const TableHeaders = [
  { key: 'id', label: 'ID' },
  { key: '角色', label: '角色' },
  { key: '规格', label: '规格' },
  { key: 'IP', label: 'IP' },
  { key: 'ssh密码', label: 'ssh密码' },
  { key: '操作', label: '操作' }
];

const SelectNodes = [
  {
    label: '2C4G',
    key: 't2.medium'
  },
  {
    label: '2C8G',
    key: 't2.large'
  },
  {
    label: '4C16G',
    key: 't2.xlarge'
  }
];

export { TableHeaders, SelectNodes };
