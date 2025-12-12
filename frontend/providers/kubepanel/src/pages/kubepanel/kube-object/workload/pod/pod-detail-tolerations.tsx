import { KubeObjectTolerations } from '@/components/kube/object/kube-object-tolerations';
import { KubeObject, Toleration } from '@/k8slens/kube-object';
import { DrawerItem } from '@/components/common/drawer/drawer-item';

interface KubeObjectWithTolerations extends KubeObject {
  getTolerations(): Toleration[];
}

interface Props {
  workload?: KubeObjectWithTolerations;
}

const PodDetailTolerations = ({ workload }: Props) => {
  if (!workload) return null;
  const tolerations = workload.getTolerations();
  if (tolerations.length === 0) return null;

  return (
    <>
      <DrawerItem name="Tolerations" />
      <KubeObjectTolerations tolerations={tolerations} />
    </>
  );
};

export default PodDetailTolerations;
