import { Table } from 'antd';
import { Toleration } from '@/k8slens/kube-object';
import { ColumnsType } from 'antd/es/table';

interface Props {
  tolerations: Array<Toleration>;
}

const columns: ColumnsType<Toleration> = [
  {
    title: 'Key',
    dataIndex: 'key',
    key: 'key'
  },
  {
    title: 'Operator',
    dataIndex: 'operator',
    key: 'operator'
  },
  {
    title: 'Value',
    dataIndex: 'value',
    key: 'value'
  },
  {
    title: 'Effect',
    dataIndex: 'effect',
    key: 'effect'
  },
  {
    title: 'Seconds',
    dataIndex: 'tolerationSeconds',
    key: 'toleration-seconds'
  }
];

export const KubeObjectTolerations = ({ tolerations }: Props) => {
  return <Table scroll={{ x: true }} columns={columns} dataSource={tolerations} />;
};
