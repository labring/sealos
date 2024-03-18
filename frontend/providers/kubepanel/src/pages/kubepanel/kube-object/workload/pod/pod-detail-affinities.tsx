import { Input } from 'antd';
import { DaemonSet, Deployment, Job, Pod, ReplicaSet, StatefulSet } from '@/k8slens/kube-object';
import yaml from 'js-yaml';
import { DrawerCollapse } from '@/components/common/drawer/drawer-collapse';

export type Props = {
  workload?: Pod | Deployment | DaemonSet | StatefulSet | ReplicaSet | Job;
};

const PodDetailAffinities = ({ workload }: Props) => {
  if (!workload) return null;
  const affinitiesNum = workload.getAffinityNumber();
  const affinities = workload.getAffinity();

  if (!affinitiesNum) return null;

  return (
    <DrawerCollapse header={{ name: 'Affinities', value: affinitiesNum }}>
      <Input.TextArea disabled rows={4} value={yaml.dump(affinities)} />
    </DrawerCollapse>
  );
};

export default PodDetailAffinities;
