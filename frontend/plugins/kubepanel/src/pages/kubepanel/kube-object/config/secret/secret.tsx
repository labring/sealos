import { KubeBadge } from '@/components/kube/kube-badge';
import { KubeObjectAge } from '@/components/kube/object/kube-object-age';
import { Secret } from '@/k8slens/kube-object';
import { ColumnsType } from 'antd/lib/table';
import { useSecretStore } from '@/store/kube';
import SecretDetail from './secret-detail';
import { PanelTable } from '@/components/common/panel-table/table';
import { ActionButton } from '@/components/common/action/action-button';

const columns: ColumnsType<Secret> = [
  {
    title: 'Labels',
    key: 'labels',
    render: (_, secret) =>
      secret.getLabels().map((label) => <KubeBadge key={label} label={label} expandable={false} />)
  },
  {
    title: 'Keys',
    key: 'keys',
    render: (_, secret) => secret.getKeys().join(', ')
  },
  {
    title: 'Type',
    key: 'type',
    dataIndex: 'type'
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
  const { items, initialize, isLoaded, watch } = useSecretStore();

  return (
    <PanelTable
      columns={columns}
      dataSource={items}
      loading={!isLoaded}
      sectionTitle="Secrets"
      DetailDrawer={SecretDetail}
      getRowKey={(secret) => secret.getId()}
      initializers={[initialize]}
      watchers={[watch]}
      getDetailItem={(secret) => secret}
    />
  );
};

export default SecretOverviewPage;
