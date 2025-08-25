import { KubeObjectTolerations } from '@/components/kube/object/kube-object-tolerations';
import { KubeObject, Toleration } from '@/k8slens/kube-object';
import { DrawerCollapse } from '@/components/common/drawer/drawer-collapse';

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
    <DrawerCollapse header={{ name: 'Tolerations', value: tolerations.length }}>
      <KubeObjectTolerations tolerations={tolerations} />
    </DrawerCollapse>
  );
};

export default PodDetailTolerations;
