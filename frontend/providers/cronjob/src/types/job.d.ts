import { V1PodTemplateSpec } from '@kubernetes/client-node';
import { V1CronJob } from '@kubernetes/client-node';
import { CronJobStatusEnum } from '@/constants/job';

export type CronJobActiveHistoryType = {
  apiVersion: string;
  kind: string;
  name: string;
  namespace: string;
  resourceVersion: string;
  uid: string;
};

export interface CronJobStatusMapType {
  label: string;
  value: CronJobStatusEnum;
  color: string;
  backgroundColor: string;
  dotColor: string;
}

export type CronJobListItemType = {
  id: string;
  name: string;
  status: CronJobStatusMapType;
  schedule: string;
  createTime: string;
  lastScheduleTime: string;
  lastSuccessfulTime: string;
};

export type CronJobEditType = {
  jobType: string;
  jobName: string;
  schedule: string;
  imageName: string;
  runCMD: string;
  cmdParam: string;
  secret: {
    use: boolean;
    username: string;
    password: string;
    serverAddress: string;
  };
  envs: {
    key: string;
    value: string;
    valueFrom?: any;
  }[];
} & CronJobScheduleType;

export type CreateScheduleType = 'day' | 'hour' | 'week';

export type CronJobScheduleType = {
  scheduleType: CreateScheduleType;
  week: string[];
  hour: string;
  minute: string;
};
