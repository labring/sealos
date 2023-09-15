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
  nextExecutionTime: string;
};

export type CronJobEditType = {
  jobType: 'url' | 'image' | 'launchpad';
  jobName: string;
  // cron schedule
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
  // cron type
  url: string;
  // launchpad
  enableNumberCopies: boolean;
  enableResources: boolean;
  replicas: number;
  cpu: number;
  memory: number;
  launchpadName: string;
  launchpadId: string;
  serviceAccountName: string;
} & CronJobDetailType;

export type CronJobDetailType = {
  status: CronJobStatusMapType;
  isPause: boolean;
  creatTime: string;
  _schedule: string;
  nextExecutionTime: string;
};

export type CreateScheduleType = 'day' | 'hour' | 'week';

export type CronJobScheduleType = {
  scheduleType: CreateScheduleType;
  week: string[];
  hour: string;
  minute: string;
};

export interface JobEvent {
  id: string;
  reason: string;
  message: string;
  count: number;
  type: string | 'Normal' | 'Warning';
  firstTime: string;
  lastTime: string;
}

export type JobList = {
  total: number;
  successAmount: number;
  history: {
    status: boolean;
    startTime: string;
    completionTime: string;
    uid: string | undefined;
    name: string | undefined;
    events: JobEvent[];
    logs: string;
    podName: string;
    startTimeTimestamp: number;
  }[];
};

export type CronJobAnnotations = {
  timeZone: string;
  enableNumberCopies: string;
  enableResources: string;
  cpu: string;
  memory: string;
  launchpadName: string;
  launchpadId: string;
  replicas: string;
};
