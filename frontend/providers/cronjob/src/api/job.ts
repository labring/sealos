import { GET, POST } from '@/services/request';
import { CronJobEditType } from '@/types/job';
import { adaptJobList } from '@/utils/adapt';
import { json2StartOrStop } from '@/utils/json2Yaml';

export const applyYamlList = (yamlList: string[], type: 'create' | 'replace' | 'update') =>
  POST('/api/applyYamlList', { yamlList, type });

export const getMyJobList = () => GET('/api/getJobList').then((data) => data.map(adaptJobList));

export const updateCronJobStatus = ({
  jobName,
  type
}: {
  jobName: string;
  type: 'Stop' | 'Start';
}) => POST('/api/startAndStop', { jobName, type });
