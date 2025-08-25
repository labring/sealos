import { Pod } from '@/k8slens/kube-object';
import { getStatusColor } from '@/utils/status-color';
import { countBy, entries } from 'lodash';

interface Props {
  pods?: Pod[];
}
const PodDetailStatuses = ({ pods }: Props) => {
  if (!pods) return null;
  if (!pods.length) return null;
  const statuses = countBy(pods.map((pod) => pod.getStatus()));

  return (
    <div>
      {entries(statuses).map(([phase, count]) => (
        <span
          key={phase}
          className={`mr-1 text-${getStatusColor(phase)}`}
        >{`${phase}: ${count}`}</span>
      ))}
    </div>
  );
};

export default PodDetailStatuses;
