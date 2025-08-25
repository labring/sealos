import { StatusMapType } from './status';

export type CronJobListItemType = {
  id: string;
  name: string;
  status: StatusMapType;
  schedule: string;
  createTime: string;
  lastScheduleTime: string;
  lastSuccessfulTime: string;
  nextExecutionTime: string;
};
