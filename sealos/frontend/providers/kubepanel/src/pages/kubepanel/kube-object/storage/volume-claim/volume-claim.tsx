import { KubeObjectAge } from '@/components/kube/object/kube-object-age';
import { PersistentVolumeClaim, Pod } from '@/k8slens/kube-object';
import { ColumnsType } from 'antd/es/table';
import PersistentVolumeClaimDetail from './volume-claim-detail';
import { usePodStore, useVolumeClaimStore } from '@/store/kube';
import { PanelTable } from '@/components/common/panel-table/table';
import { ActionButton } from '@/components/common/action/action-button';

const columns: ColumnsType<{ volumeClaim: PersistentVolumeClaim; pods: Pod[] }> = [
  {
    title: 'Storage Class',
    key: 'storageClass',
    render: (_, { volumeClaim }) => volumeClaim.spec.storageClassName
  },
  {
    title: 'Size',
    key: 'size',
    render: (_, { volumeClaim }) => volumeClaim.getStorage()
  },
  {
    title: 'Pods',
    key: 'pods',
    ellipsis: true,
    render: (_, { volumeClaim, pods }) => {
      const podsNames = volumeClaim.getPods(pods).map((pod) => pod.getName());
      return podsNames.map((name) => (
        <span key={name} className="text-blue-300 mr-1">
          {name}
        </span>
      ));
    }
  },
  {
    title: 'Age',
    key: 'age',
    render: (_, { volumeClaim }) => <KubeObjectAge obj={volumeClaim} />
  },
  {
    title: 'Status',
    fixed: 'right',
    key: 'status',
    render: (_, { volumeClaim }) => volumeClaim.getStatus()
  },
  {
    key: 'action',
    fixed: 'right',
    render: (_, { volumeClaim }) => <ActionButton obj={volumeClaim} />
  }
];

const PersistentVolumeClaimOverviewPage = () => {
  const {
    items: volumeClaims,
    initialize: initializeVolumeClaims,
    isLoaded: isVolumeClaimsLoaded,
    watch: watchVolumeClaims
  } = useVolumeClaimStore();
  const {
    items: pods,
    initialize: initializePods,
    isLoaded: isPodsLoaded,
    watch: watchPods
  } = usePodStore();

  const dataSource = volumeClaims.map((volumeClaim) => ({
    volumeClaim,
    pods
  }));

  return (
    <PanelTable
      columns={columns}
      dataSource={dataSource}
      loading={!isVolumeClaimsLoaded || !isPodsLoaded}
      sectionTitle="Persistent Volume Claims"
      DetailDrawer={({ obj, open, onClose }) => (
        <PersistentVolumeClaimDetail
          obj={obj instanceof PersistentVolumeClaim ? { volumeClaim: obj, pods } : null}
          open={open}
          onClose={onClose}
        />
      )}
      getRowKey={({ volumeClaim }) => volumeClaim.getId()}
      initializers={[initializeVolumeClaims, initializePods]}
      watchers={[watchVolumeClaims, watchPods]}
      getDetailItem={(record) => record.volumeClaim}
    />
  );
};

export default PersistentVolumeClaimOverviewPage;
