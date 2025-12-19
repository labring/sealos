import { KubeObjectAge } from '@/components/kube/object/kube-object-age';
import { Secret } from '@/k8slens/kube-object';
import { ColumnsType } from 'antd/lib/table';
import { useSecretStore } from '@/store/kube';
import SecretDetail from './secret-detail';
import { ResponsiveKeyList } from '@/components/kube/object/responsive-key-list';
import { PanelTable } from '@/components/common/panel-table/table';
import { ActionButton } from '@/components/common/action/action-button';

const columns: ColumnsType<Secret> = [
  {
    title: 'Keys',
    key: 'keys',
    render: (_, secret) => <ResponsiveKeyList keys={secret.getKeys()} />
  },
  {
    title: 'Type',
    key: 'type',
    dataIndex: 'type',
    width: 250 // Keeping Type explicit width as it's usually short but important
  },
  {
    title: 'Age',
    key: 'age',
    render: (_, secret) => <KubeObjectAge obj={secret} />
  },
  {
    fixed: 'right',
    key: 'action',
    render: (_, secret) => <ActionButton obj={secret} />
  }
];

const SecretOverviewPage = () => {
  const { items, initialize, isLoaded } = useSecretStore();

  return (
    <PanelTable
      columns={columns}
      dataSource={items}
      loading={!isLoaded}
      sectionTitle="Secrets"
      DetailDrawer={SecretDetail}
      getRowKey={(secret) => secret.getId()}
      initializers={[initialize]}
      getDetailItem={(secret) => secret}
    />
  );
};

export default SecretOverviewPage;
