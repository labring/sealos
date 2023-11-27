import { Pod, StatefulSet } from '@/k8slens/kube-object';
import Drawer from '../../../drawer/drawer';
import { KubeObjectInfoList } from '@/components/kube/object/detail/kube-object-detail-info-list';
import PodDetailTolerations from '../pod/pod-detail-tolerations';
import PodDetailAffinities from '../pod/pod-detail-affinities';
import { DrawerItem } from '@/pages/kubepanel/components/drawer/drawer-item';
import PodDetailStatuses from '../pod/pod-detail-statuses';
import { KubeBadge } from '@/components/kube/kube-badge';
import DrawerPanel from '../../../drawer/drawer-panel';

interface Props {
  statefulSet?: StatefulSet;
  childPods: Pod[];
  open: boolean;
  onClose: () => void;
}

const StatefulSetDetail = ({ statefulSet, childPods, open, onClose }: Props) => {
  if (!statefulSet) return null;

  if (!(statefulSet instanceof StatefulSet)) {
    // logger.error("[StatefulSetDetails]: passed object that is not an instanceof StatefulSet", statefulSet);

    return null;
  }

  const images = statefulSet.getImages();
  const selectors = statefulSet.getSelectors();

  return (
    <Drawer open={open} title={`StatefulSet: ${statefulSet.getName()}`} onClose={onClose}>
      <DrawerPanel>
        <KubeObjectInfoList obj={statefulSet} />
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
        <PodDetailTolerations workload={statefulSet} />
        <PodDetailAffinities workload={statefulSet} />
        <DrawerItem name="Pod Status" value={<PodDetailStatuses pods={childPods} />} />
      </DrawerPanel>
    </Drawer>
  );
};

export default StatefulSetDetail;
