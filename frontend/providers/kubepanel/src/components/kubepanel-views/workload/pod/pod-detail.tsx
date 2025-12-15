import { DrawerItem } from '@/components/common/drawer/drawer-item';
import { KubeObjectInfoList } from '@/components/kube/object/detail/kube-object-detail-info-list';
import { Pod } from '@/k8slens/kube-object';
import { Divider, Tooltip } from 'antd';
import PodStatus from './pod-status';
import { KubeBadge } from '@/components/kube/kube-badge';
import PodDetailTolerations from './pod-detail-tolerations';
import PodDetailAffinities from './pod-detail-affinities';
import ContainerDetail from './container-detail';
import { Drawer } from '@/components/common/drawer/drawer';
import { DrawerPanel } from '@/components/common/drawer/drawer-panel';

const PodDetail = ({ obj: pod, open, onClose }: DetailDrawerProps<Pod>) => {
  if (!pod || !(pod instanceof Pod)) return null;

  return (
    <Drawer open={open} title={`Pod: ${pod.getName()}`} onClose={onClose}>
      <DrawerPanel>
        <PodInfo pod={pod} />
        <Divider />
        <ContainerDetail pod={pod} editable={false} />
      </DrawerPanel>
    </Drawer>
  );
};

const PodInfo = ({ pod }: { pod: Pod }) => {
  const { status } = pod;
  const { conditions = [], podIP } = status ?? {};

  const priorityClassName = pod.getPriorityClassName();
  const runtimeClassName = pod.getRuntimeClassName();
  const serviceAccountName = pod.getServiceAccountName();

  // TODO: Link
  // const priorityClassDetailsUrl = getDetailsUrl(this.props.priorityClassApi.formatUrlForNotListing({
  //   name: priorityClassName,
  // }));
  // const runtimeClassDetailsUrl = getDetailsUrl(this.props.runtimeClassApi.formatUrlForNotListing({
  //   name: runtimeClassName,
  // }));
  // const serviceAccountDetailsUrl = getDetailsUrl(this.props.serviceAccountApi.formatUrlForNotListing({
  //   name: serviceAccountName,
  //   namespace,
  // }));

  return (
    <>
      <KubeObjectInfoList obj={pod} />
      <div className="flex items-center justify-between py-2 border-b border-[#E8E8E8]">
        <div>
          <span className="text-[#8C8C8C] font-medium text-sm block mb-1">Pod IP</span>
          <span className="text-blue-600 text-sm">{podIP || '-'}</span>
        </div>
        <div>
          <span className="text-[#8C8C8C] font-medium text-sm block mb-1">Service Account</span>
          <span className="text-[#262626] text-sm">{serviceAccountName || '-'}</span>
        </div>
        <div>
          <span className="text-[#8C8C8C] font-medium text-sm block mb-1">QoS Class</span>
          <span className="text-[#262626] text-sm">{pod.getQosClass() || '-'}</span>
        </div>
      </div>
      <DrawerItem
        hidden={priorityClassName === ''}
        name="Priority Class"
        value={
          // TODO: Link
          <>{priorityClassName}</>
        }
      />
      <DrawerItem
        hidden={runtimeClassName === ''}
        name="Runtime Class"
        value={
          // TODO: Link
          <>{runtimeClassName}</>
        }
      />

      <DrawerItem
        hidden={conditions.length === 0}
        name={'Conditions'}
        value={
          <div className="flex flex-wrap gap-1">
            {conditions.map(({ type, status, lastTransitionTime }) => (
              <Tooltip
                key={type}
                title={`Last transition time: ${lastTransitionTime ?? '<unknown>'}`}
              >
                <KubeBadge label={type} disabled={status === 'False'} />
              </Tooltip>
            ))}
          </div>
        }
      />
      <PodDetailTolerations workload={pod} />
      <PodDetailAffinities workload={pod} />
    </>
  );
};

export default PodDetail;
