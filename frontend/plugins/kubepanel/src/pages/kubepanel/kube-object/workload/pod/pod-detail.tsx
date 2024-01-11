import { DrawerItem } from '@/components/common/drawer/drawer-item';
import { KubeObjectInfoList } from '@/components/kube/object/detail/kube-object-detail-info-list';
import { Pod } from '@/k8slens/kube-object';
import { Tooltip } from 'antd';
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
      <PodInfo pod={pod} />
      <ContainerDetail pod={pod} />
    </Drawer>
  );
};

const PodInfo = ({ pod }: { pod: Pod }) => {
  const { status } = pod;
  const { conditions = [], podIP } = status ?? {};
  const podIPs = pod.getIPs();

  const priorityClassName = pod.getPriorityClassName();
  const runtimeClassName = pod.getRuntimeClassName();
  const serviceAccountName = pod.getServiceAccountName();
  const secrets = pod.getSecrets();

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
    <DrawerPanel>
      <KubeObjectInfoList obj={pod} />
      <DrawerItem name="Status" value={<PodStatus status={pod.getStatusMessage()} />} />
      <DrawerItem name="Pod IP" value={podIP} />
      <DrawerItem
        hidden={podIPs.length === 0}
        name="Pod IPs"
        value={podIPs.map((label) => (
          <KubeBadge key={label} label={label} />
        ))}
      />
      <DrawerItem
        name="Service Account"
        value={
          // TODO: Link
          <>{serviceAccountName}</>
        }
      />
      <DrawerItem
        hidden={priorityClassName === ''}
        name="Priority Class"
        value={
          // TODO: Link
          <>{priorityClassName}</>
        }
      />
      <DrawerItem name="QoS Class" value={pod.getQosClass()} />
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
          <>
            {conditions.map(({ type, status, lastTransitionTime }) => (
              <Tooltip
                key={type}
                title={`Last transition time: ${lastTransitionTime ?? '<unknown>'}`}
              >
                <KubeBadge label={type} disabled={status === 'False'} />
              </Tooltip>
            ))}
          </>
        }
      />
      <PodDetailTolerations workload={pod} />
      <PodDetailAffinities workload={pod} />

      <DrawerItem
        hidden={secrets.length === 0}
        name="Secrets"
        value={secrets.map((secret) => (
          <div className="mb-1 last:mb-0" key={secret}>
            {secret}
          </div>
        ))}
      />
    </DrawerPanel>
  );
};

export default PodDetail;
