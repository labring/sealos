import { CronJobEditType, CronJobListItemType } from '@/types/job';
import { V1CronJob } from '@kubernetes/client-node';
import dayjs from 'dayjs';

export const adaptJobList = (job: V1CronJob): CronJobListItemType => {
  // compute store amount
  return {
    id: job.metadata?.uid || '',
    name: job.metadata?.name || 'job name',
    createTime: dayjs(job.metadata?.creationTimestamp).format('YYYY/MM/DD HH:mm'),
    status: job.spec?.suspend ? 'Suspend' : 'Running',
    schedule: job.spec?.schedule || 'schedule',
    lastScheduleTime: dayjs(job?.status?.lastScheduleTime).format('YYYY/MM/DD HH:mm'),
    lastSuccessfulTime: dayjs(job?.status?.lastSuccessfulTime).format('YYYY/MM/DD HH:mm')
  };
};

export const adaptJobDetail = (job: V1CronJob): CronJobEditType => {
  return {
    jobType: '',
    jobName: job.metadata?.name || '',
    schedule: job.spec?.schedule || '',
    imageName:
      job?.metadata?.annotations?.originImageName ||
      job.spec?.jobTemplate?.spec?.template?.spec?.containers?.[0]?.image ||
      '',
    runCMD: JSON.stringify(job.spec?.jobTemplate?.spec?.template?.spec?.containers?.[0]?.command),
    cmdParam: JSON.stringify(job.spec?.jobTemplate?.spec?.template?.spec?.containers?.[0]?.args),
    secret: {
      use: false,
      username: '',
      password: '',
      serverAddress: 'docker.io'
    },
    envs:
      job.spec?.jobTemplate?.spec?.template?.spec?.containers?.[0]?.env?.map((env) => {
        return {
          key: env.name,
          value: env.value || '',
          valueFrom: env.valueFrom
        };
      }) || [],
    scheduleType: 'hour',
    week: [],
    hour: '*',
    minute: '*'
  };
};
