import { getStatusColor } from '@/utils/status-color';

const PodStatus = ({ status }: { status: string }) => {
  const color = getStatusColor(status) ?? 'color-vague';
  return <span className={`text-${color}`}>{status}</span>;
};

export default PodStatus;
