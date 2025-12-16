import { Drawer } from '@/components/common/drawer/drawer';
import { DrawerItem } from '@/components/common/drawer/drawer-item';
import { DrawerPanel } from '@/components/common/drawer/drawer-panel';
import { DetailDrawerProps } from '@/components/common/panel-table/table';
import { StatusTag } from '@/components/common/status-tag';
import { KubeObjectInfoList } from '@/components/kube/object/detail/kube-object-detail-info-list';
import { Cluster } from '@/k8slens/kube-object/src/specifics/cluster';

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

const ClusterDetail = ({ open, obj: cluster, onClose }: DetailDrawerProps<Cluster>) => {
  if (!cluster) return null;

  return (
    <Drawer open={open} title={`Cluster: ${cluster.getName()}`} onClose={onClose}>
      <DrawerPanel>
        <KubeObjectInfoList obj={cluster} />

        <DrawerItem
          name="Phase"
          value={
            <StatusTag color={getPhaseColor(cluster.getPhase())}>{cluster.getPhase()}</StatusTag>
          }
        />

        <DrawerItem name="Definition" value={cluster.getClusterDefinition() || '-'} />

        <DrawerItem name="Version" value={cluster.getClusterVersion() || '-'} />

        <DrawerItem
          name="Resources"
          value={
            <span className="text-[#262626] text-sm">
              CPU: {cluster.getCpu() || '-'} &nbsp;/&nbsp; Memory: {cluster.getMemory() || '-'}{' '}
              &nbsp;/&nbsp; Storage: {cluster.getStorage() || '-'}
            </span>
          }
        />

        <DrawerItem name="Replicas" value={cluster.getReplicas().toString()} />

        <DrawerItem
          name="Backup"
          value={
            cluster.isBackupEnabled() ? (
              <StatusTag color="green">Enabled</StatusTag>
            ) : (
              <StatusTag>Disabled</StatusTag>
            )
          }
        />

        <DrawerItem name="Termination" value={cluster.getTerminationPolicy() || '-'} />
      </DrawerPanel>
    </Drawer>
  );
};

export default ClusterDetail;
