import { DaemonSet, Deployment, Job, Pod, ReplicaSet, StatefulSet } from '@/k8slens/kube-object';
import { DrawerCollapse } from '@/components/common/drawer/drawer-collapse';
import { KubeObjectAffinities } from '@/components/kube/object/kube-object-affinities';

export type Props = {
  workload?: Pod | Deployment | DaemonSet | StatefulSet | ReplicaSet | Job;
};

const PodDetailAffinities = ({ workload }: Props) => {
  if (!workload) return null;
  const affinitiesNum = workload.getAffinityNumber();
  const affinities = workload.getAffinity();

  if (!affinitiesNum || !affinities) return null;

  return (
    <DrawerCollapse header={{ name: 'Affinities', value: affinitiesNum }}>
      <KubeObjectAffinities affinity={affinities} />
    </DrawerCollapse>
  );
};

export default PodDetailAffinities;
