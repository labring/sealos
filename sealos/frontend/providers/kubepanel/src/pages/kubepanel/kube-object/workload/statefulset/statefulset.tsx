import { KubeObjectAge } from '@/components/kube/object/kube-object-age';
import { StatefulSet } from '@/k8slens/kube-object';
import { ColumnsType } from 'antd/es/table';
import StatefulSetDetail from './statefulset-detail';
import { usePodStore, useStatefulSetStore } from '@/store/kube';
import { PanelTable } from '@/components/common/panel-table/table';
import { ActionButton } from '@/components/common/action/action-button';

const columns: ColumnsType<StatefulSet> = [
  {
    title: 'Pods',
    key: 'pods',
    render: (_, stat) => {
      const { readyReplicas = 0, replicas = 0 } = stat.status ?? {};
      return `${readyReplicas}/${replicas}`;
    }
  },
  {
    title: 'Replicas',
    key: 'replicas',
    render: (_, stat) => stat.getReplicas()
  },
  {
    title: 'Age',
    key: 'age',
    render: (_, stat) => <KubeObjectAge obj={stat} />
  },
  {
    key: 'action',
    fixed: 'right',
    render: (_, stat) => <ActionButton obj={stat} />
  }
];

const StatefulSetOverviewPage = () => {
  // The detailed information of Stateful Set resource needs to be provided by Pod resource.
  const { initialize: initializePods, isLoaded: isPodsLoaded, watch: watchPods } = usePodStore();
  const {
    items: stats,
    initialize: initializeStats,
    isLoaded: isStatsLoaded,
    watch: watchStats
  } = useStatefulSetStore();

  return (
    <PanelTable
      columns={columns}
      loading={!isStatsLoaded || !isPodsLoaded}
      dataSource={stats}
      sectionTitle="Stateful Sets"
      DetailDrawer={StatefulSetDetail}
      getRowKey={(stat) => stat.getId()}
      initializers={[initializeStats, initializePods]}
      watchers={[watchStats, watchPods]}
      getDetailItem={(stat) => stat}
    />
  );
};

export default StatefulSetOverviewPage;
