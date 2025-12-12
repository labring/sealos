import { PodContainerStatus } from '@/k8slens/kube-object';
import { getStatusBadgeTone } from '@/utils/status-color';
import { lowerCase } from 'lodash';

interface ContainerStatusBrickProps {
  state: string;
  status?: PodContainerStatus | null;
}

const statusToColor: Record<string, string> = {
  success: '#52c41a',
  warning: '#faad14',
  error: '#ff4d4f',
  default: '#d9d9d9',
  processing: '#1890ff'
};

const ContainerStatusBrick = ({ state, status }: ContainerStatusBrickProps) => {
  const { ready = false } = status ?? {};

  const badgeTone =
    !ready && lowerCase(state) === 'running' ? 'warning' : (getStatusBadgeTone(state) ?? 'default');

  const color = statusToColor[badgeTone];

  return <div className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />;
};

export default ContainerStatusBrick;
