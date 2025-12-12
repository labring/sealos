import { Devbox } from '@/k8slens/kube-object/src/specifics/devbox';
import { DrawerItem } from '@/components/common/drawer/drawer-item';
import { DrawerPanel } from '@/components/common/drawer/drawer-panel';
import { Drawer } from '@/components/common/drawer/drawer';
import { KubeObjectInfoList } from '@/components/kube/object/detail/kube-object-detail-info-list';
import { DetailDrawerProps } from '@/components/common/panel-table/table';
import { StatusTag } from '@/components/common/status-tag';

const getStateColor = (state: string) => {
  switch (state.toLowerCase()) {
    case 'running':
      return 'green';
    case 'stopped':
      return 'default';
    case 'pending':
      return 'orange';
    case 'error':
    case 'failed':
      return 'red';
    default:
      return 'blue';
  }
};

const DevboxDetail = ({ open, obj: devbox, onClose }: DetailDrawerProps<Devbox>) => {
  if (!devbox) return null;

  const networkType = devbox.getNetworkType();
  const nodePort = devbox.getNodePort();
  const networkDisplay = networkType
    ? nodePort
      ? `${networkType}: ${nodePort}`
      : networkType
    : '-';

  return (
    <Drawer open={open} title={`Devbox: ${devbox.getName()}`} onClose={onClose}>
      <DrawerPanel>
        <KubeObjectInfoList obj={devbox} />

        <DrawerItem
          name="State"
          value={
            <StatusTag color={getStateColor(devbox.getState())}>{devbox.getState()}</StatusTag>
          }
        />

        <DrawerItem name="Phase" value={devbox.getPhase()} />

        <DrawerItem name="Image" value={devbox.getImage() || '-'} />

        <DrawerItem
          name="Resources"
          value={
            <span className="text-[#262626] text-sm">
              CPU: {devbox.getCpu() || '-'} &nbsp;/&nbsp; Memory: {devbox.getMemory() || '-'}{' '}
              &nbsp;/&nbsp; Storage: {devbox.getStorageLimit() || '-'}
            </span>
          }
        />

        <DrawerItem name="Network" value={networkDisplay} />
      </DrawerPanel>
    </Drawer>
  );
};

export default DevboxDetail;
