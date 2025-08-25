import { StatefulSet } from '@/k8slens/kube-object';
import { Drawer } from '@/components/common/drawer/drawer';
import { KubeObjectInfoList } from '@/components/kube/object/detail/kube-object-detail-info-list';
import PodDetailTolerations from '../pod/pod-detail-tolerations';
import PodDetailAffinities from '../pod/pod-detail-affinities';
import { DrawerItem } from '@/components/common/drawer/drawer-item';
import PodDetailStatuses from '../pod/pod-detail-statuses';
import { KubeBadge } from '@/components/kube/kube-badge';
import { DrawerPanel } from '@/components/common/drawer/drawer-panel';
import { isArray } from 'lodash';
import { getPodsByOwnerId, usePodStore } from '@/store/kube';

const StatefulSetDetail = ({ obj: stat, open, onClose }: DetailDrawerProps<StatefulSet>) => {
  if (!stat) return null;

  const { items: pods } = usePodStore();
  const childPods = getPodsByOwnerId(pods, stat.getId());

  if (!stat || !(stat instanceof StatefulSet)) return null;
  if (!childPods || !isArray(childPods)) return null;

  const images = stat.getImages();
  const selectors = stat.getSelectors();

  return (
    <Drawer open={open} title={`StatefulSet: ${stat.getName()}`} onClose={onClose}>
      <DrawerPanel>
        <KubeObjectInfoList obj={stat} />
        {selectors.length > 0 && (
          <DrawerItem
            name="Selector"
            value={selectors.map((label) => (
              <KubeBadge key={label} label={label} />
            ))}
          />
        )}
        {images.length > 0 && (
          <DrawerItem
            name="Images"
            value={images.map((image) => (
              <p key={image}>{image}</p>
            ))}
          />
        )}
        <PodDetailTolerations workload={stat} />
        <PodDetailAffinities workload={stat} />
        <DrawerItem name="Pod Status" value={<PodDetailStatuses pods={childPods} />} />
      </DrawerPanel>
    </Drawer>
  );
};

export default StatefulSetDetail;
