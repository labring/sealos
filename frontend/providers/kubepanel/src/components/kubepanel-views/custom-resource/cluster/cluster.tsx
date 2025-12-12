import { Cluster } from '@/k8slens/kube-object/src/specifics/cluster';
import { KubeObjectAge } from '@/components/kube/object/kube-object-age';
import { PanelTable } from '@/components/common/panel-table/table';
import { useClusterStore } from '@/store/kube';
import { ActionButton } from '@/components/common/action/action-button';
import ClusterDetail from './cluster-detail';
import type { ColumnsType } from 'antd/es/table';
import { StatusTag } from '@/components/common/status-tag';

const getPhaseColor = (phase: string) => {
  switch (phase) {
    case 'Running':
      return 'green';
    case 'Stopped':
    case 'Deleting':
      return 'default';
    case 'Creating':
    case 'Updating':
      return 'blue';
    case 'Failed':
      return 'red';
    default:
      return 'orange';
  }
};

const columns: ColumnsType<Cluster> = [
  {
    title: 'Phase',
    key: 'phase',
    render: (_, cluster) => (
      <StatusTag color={getPhaseColor(cluster.getPhase())}>{cluster.getPhase()}</StatusTag>
    )
  },
  {
    title: 'Definition',
    key: 'definition',
    render: (_, cluster) => cluster.getClusterDefinition() || '-'
  },
  {
    title: 'Version',
    key: 'version',
    render: (_, cluster) => cluster.getClusterVersion() || '-'
  },
  {
    title: 'Replicas',
    key: 'replicas',
    render: (_, cluster) => cluster.getReplicas()
  },
  {
    title: 'Age',
    key: 'age',
    render: (_, cluster) => <KubeObjectAge obj={cluster} />
  },
  {
    fixed: 'right',
    key: 'action',
    render: (_, cluster) => <ActionButton obj={cluster} />
  }
];

const ClusterPage = () => {
  const { items, initialize, isLoaded } = useClusterStore();

  return (
    <PanelTable<Cluster, Cluster>
      columns={columns}
      loading={!isLoaded}
      dataSource={items}
      sectionTitle="Cluster"
      getRowKey={(cluster) => cluster.getId()}
      getDetailItem={(cluster) => cluster}
      DetailDrawer={ClusterDetail}
      initializers={[initialize]}
    />
  );
};

export default ClusterPage;
