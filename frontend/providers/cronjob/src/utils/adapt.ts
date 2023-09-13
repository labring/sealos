import { CronJobEditType, CronJobListItemType } from '@/types/job';
import { V1CronJob } from '@kubernetes/client-node';
import dayjs from 'dayjs';
import { cron2Time } from '@/utils/tools';
import { CronJobStatusMap, StatusEnum } from '@/constants/job';

export const adaptJobList = (job: V1CronJob): CronJobListItemType => {
  const status_str = job.spec?.suspend ? StatusEnum.Stopped : StatusEnum.Running;

  return {
    id: job.metadata?.uid || '',
    name: job.metadata?.name || 'job name',
    createTime: dayjs(job.metadata?.creationTimestamp).format('YYYY/MM/DD HH:mm'),
    status: CronJobStatusMap[status_str]
      ? CronJobStatusMap[status_str]
      : CronJobStatusMap['UnKnow'],
    schedule: job.spec?.schedule || 'schedule',
    lastScheduleTime: dayjs(job?.status?.lastScheduleTime).format('YYYY/MM/DD HH:mm'),
    lastSuccessfulTime: dayjs(job?.status?.lastSuccessfulTime).format('YYYY/MM/DD HH:mm')
  };
};

export const adaptJobDetail = (job: V1CronJob): CronJobEditType => {
  const cronObj = cron2Time(job.spec?.schedule || '');

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
    scheduleType: cronObj.scheduleType,
    week: cronObj.week,
    hour: cronObj.hour,
    minute: cronObj.minute
  };
};
