import { Bucket } from '@/k8slens/kube-object/src/specifics/bucket';
import { DrawerItem } from '@/components/common/drawer/drawer-item';
import { DrawerPanel } from '@/components/common/drawer/drawer-panel';
import { Drawer } from '@/components/common/drawer/drawer';
import { KubeObjectInfoList } from '@/components/kube/object/detail/kube-object-detail-info-list';
import { DetailDrawerProps } from '@/components/common/panel-table/table';
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

const BucketDetail = ({ open, obj: bucket, onClose }: DetailDrawerProps<Bucket>) => {
  if (!bucket) return null;

  return (
    <Drawer open={open} title={`Bucket: ${bucket.getName()}`} onClose={onClose}>
      <DrawerPanel>
        <KubeObjectInfoList obj={bucket} />

        <DrawerItem
          name="Policy"
          value={
            <StatusTag color={getPolicyColor(bucket.getPolicy())}>
              {bucket.getPolicy() || '-'}
            </StatusTag>
          }
        />

        <DrawerItem name="Bucket Name" value={bucket.getBucketName() || '-'} />
      </DrawerPanel>
    </Drawer>
  );
};

export default BucketDetail;
