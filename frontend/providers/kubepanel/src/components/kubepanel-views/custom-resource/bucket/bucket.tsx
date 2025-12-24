import { Bucket } from '@/k8slens/kube-object/src/specifics/bucket';
import { KubeObjectAge } from '@/components/kube/object/kube-object-age';
import { PanelTable } from '@/components/common/panel-table/table';
import { useBucketStore } from '@/store/kube';
import { ActionButton } from '@/components/common/action/action-button';
import BucketDetail from './bucket-detail';
import type { ColumnsType } from 'antd/es/table';
import { StatusTag } from '@/components/common/status-tag';

const getPolicyColor = (policy: string) => {
  switch (policy) {
    case 'publicRead':
      return 'green';
    case 'publicReadwrite':
      return 'orange';
    case 'private':
      return 'default';
    default:
      return 'blue';
  }
};

const columns: ColumnsType<Bucket> = [
  {
    title: 'Policy',
    key: 'policy',
    render: (_, bucket) => (
      <StatusTag color={getPolicyColor(bucket.getPolicy())}>{bucket.getPolicy() || '-'}</StatusTag>
    )
  },
  {
    title: 'Bucket Name',
    key: 'bucketName',
    render: (_, bucket) => bucket.getBucketName() || '-'
  },
  {
    title: 'Age',
    key: 'age',
    render: (_, bucket) => <KubeObjectAge obj={bucket} />
  },
  {
    fixed: 'right',
    key: 'action',
    render: (_, bucket) => <ActionButton obj={bucket} />
  }
];

const BucketPage = () => {
  const { items, initialize, isLoaded } = useBucketStore();

  return (
    <PanelTable<Bucket, Bucket>
      columns={columns}
      loading={!isLoaded}
      dataSource={items}
      sectionTitle="Bucket"
      getRowKey={(bucket) => bucket.getId()}
      getDetailItem={(bucket) => bucket}
      DetailDrawer={BucketDetail}
      initializers={[initialize]}
    />
  );
};

export default BucketPage;
