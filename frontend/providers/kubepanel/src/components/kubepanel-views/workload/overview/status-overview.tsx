import { Flex } from 'antd';
import WorkloadStatus, { WorkloadStatusData } from './status-chart';

export interface WorkloadStatusOverviewData {
  title: string;
  data: Array<WorkloadStatusData>;
  onClickTitle?: () => void;
}

const WorkloadStatusOverview = ({ data }: { data?: Array<WorkloadStatusOverviewData> }) => {
  if (!data) return null;
  return (
    <Flex wrap="wrap" justify="space-around">
      {data.map(({ title, data, onClickTitle }) => (
        <WorkloadStatus key={title} title={title} data={data} />
      ))}
    </Flex>
  );
};

export default WorkloadStatusOverview;
