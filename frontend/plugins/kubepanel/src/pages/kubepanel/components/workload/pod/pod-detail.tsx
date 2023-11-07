import { KubeRecord } from '@/components/kube/kube-record';
import { KubeObjectInfoList } from '@/components/kube/object/detail/kube-object-detail-info-list';
import { Pod } from '@/k8slens/kube-object';
import { Tooltip } from 'antd';
import PodStatus from './pod-status';
import { KubeBadge } from '@/components/kube/kube-badge';
import PodDetailTolerations from './pod-detail-tolerations';
import PodDetailAffinities from './pod-detail-affinities';
import ContainerDetail from './container-detail';
import Drawer from '../../drawer/drawer';

interface Props {
  pod?: Pod;
  open: boolean;
  onClose: () => void;
}
const PodDetail = ({ pod, open, onClose }: Props) => {
  if (!pod) return null;

  if (!(pod instanceof Pod)) {
    // logger.error("[PodDetail]: passed object that is not an instanceof Pod", pod);

    return null;
  }

  return (
    <Drawer open={open} title={`Pod: ${pod.getName()}`} onClose={onClose}>
      <PodInfo pod={pod} />
      <div className="m-8" />
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
    <>
      <div className="p-2">
        <KubeObjectInfoList obj={pod} />
        <KubeRecord name="Status" value={<PodStatus status={pod.getStatusMessage()} />} />
        <KubeRecord name="Pod IP" value={podIP} />
        <KubeRecord
          hidden={podIPs.length === 0}
          name="Pod IPs"
          value={podIPs.map((label) => (
            <KubeBadge key={label} label={label} />
          ))}
        />
        <KubeRecord
          name="Service Account"
          value={
            // TODO: Link
            <>{serviceAccountName}</>
          }
        />
        <KubeRecord
          hidden={priorityClassName === ''}
          name="Priority Class"
          value={
            // TODO: Link
            <>{priorityClassName}</>
          }
        />
        <KubeRecord name="QoS Class" value={pod.getQosClass()} />
        <KubeRecord
          hidden={runtimeClassName === ''}
          name="Runtime Class"
          value={
            // TODO: Link
            <>{runtimeClassName}</>
          }
        />

        <KubeRecord
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

        <KubeRecord
          hidden={secrets.length === 0}
          name="Secrets"
          value={secrets.map((secret) => (
            <div className="mb-1 last:mb-0" key={secret}>
              {secret}
            </div>
          ))}
        />
      </div>
    </>
  );
};

export default PodDetail;
