import { Typography } from 'antd';
import { getStatusTextTone } from '@/utils/status-color';

const PodStatus = ({ status }: { status: string }) => {
  const textTone = getStatusTextTone(status);
  return <Typography.Text type={textTone}>{status}</Typography.Text>;
};

export default PodStatus;
