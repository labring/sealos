import { PodContainerStatus } from '@/k8slens/kube-object';
import { getStatusColor } from '@/utils/status-color';
import { lowerCase } from 'lodash';

interface ContainerStatusBrickProps {
  state: string;
  status?: PodContainerStatus | null;
}

const ContainerStatusBrick = ({ state, status }: ContainerStatusBrickProps) => {
  const { ready = false } = status ?? {};

  let color: string;
  if (!ready && lowerCase(state) === 'running') color = 'color-warning';
  else color = getStatusColor(state) ?? 'color-terminated';

  return <div className={`inline-block w-2 h-2 mr-2 rounded-sm bg-${color}`} />;
};

export default ContainerStatusBrick;
