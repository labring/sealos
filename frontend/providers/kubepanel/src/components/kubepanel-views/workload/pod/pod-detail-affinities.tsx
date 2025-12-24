import { DaemonSet, Deployment, Job, Pod, ReplicaSet, StatefulSet } from '@/k8slens/kube-object';
import { DrawerItem } from '@/components/common/drawer/drawer-item';
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
    <>
      <DrawerItem name="Affinities" />
      <KubeObjectAffinities affinity={affinities} />
    </>
  );
};

export default PodDetailAffinities;
