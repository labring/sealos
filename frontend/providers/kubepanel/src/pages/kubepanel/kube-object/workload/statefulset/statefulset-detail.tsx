import { StatefulSet } from '@/k8slens/kube-object';
import { Drawer } from '@/components/common/drawer/drawer';
import { KubeObjectInfoList } from '@/components/kube/object/detail/kube-object-detail-info-list';
import PodDetailTolerations from '../pod/pod-detail-tolerations';
import PodDetailAffinities from '../pod/pod-detail-affinities';
import { DrawerItem } from '@/components/common/drawer/drawer-item';
import ContainerDetail from '../pod/container-detail';
import { KubeBadge } from '@/components/kube/kube-badge';
import { DrawerPanel } from '@/components/common/drawer/drawer-panel';
import { useStatefulSetStore } from '@/store/kube';
import { DetailDrawerProps } from '@/components/common/panel-table/table';

const StatefulSetDetail = ({ obj: stat, open, onClose }: DetailDrawerProps<StatefulSet>) => {
  if (!stat || !(stat instanceof StatefulSet)) return null;

  const selectors = stat.getSelectors();
  const spec = stat.spec;
  const { initialize } = useStatefulSetStore();

  return (
    <Drawer open={open} title={`StatefulSet: ${stat.getName()}`} onClose={onClose}>
      <DrawerPanel>
        <KubeObjectInfoList obj={stat} />
        {selectors.length > 0 && (
          <DrawerItem
            name={<div className="pt-1">Selector</div>}
            value={
              <div className="flex flex-wrap gap-1">
                {selectors.map((label) => (
                  <KubeBadge key={label} label={label} className="m-0!" />
                ))}
              </div>
            }
          />
        )}
        <PodDetailTolerations workload={stat} />
        <PodDetailAffinities workload={stat} />
        <ContainerDetail
          containers={spec?.template?.spec?.containers}
          initContainers={spec?.template?.spec?.initContainers}
          workload={stat}
          onUpdate={() => initialize(() => {}, true)}
        />
      </DrawerPanel>
    </Drawer>
  );
};

export default StatefulSetDetail;
