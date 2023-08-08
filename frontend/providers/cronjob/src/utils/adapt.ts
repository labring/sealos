import type { KubeBlockBackupPolicyType } from '@/types/cluster';
import { CronJobListItemType, CronJobResultType } from '@/types/job';
import { convertCronTime } from '@/utils/tools';
import dayjs from 'dayjs';

export const adaptJobList = (job: CronJobResultType): CronJobListItemType => {
  // compute store amount
  return {
    id: job.metadata?.uid || ``,
    name: job.metadata?.name || 'job name',
    createTime: dayjs(job.metadata?.creationTimestamp).format('YYYY/MM/DD HH:mm'),
    status: job.spec.suspend ? 'Suspend' : 'Running',
    schedule: job.spec.schedule || 'schedule',
    lastScheduleTime: dayjs(job?.status?.lastScheduleTime).format('YYYY/MM/DD HH:mm'),
    lastSuccessfulTime: dayjs(job?.status.lastSuccessfulTime).format('YYYY/MM/DD HH:mm')
  };
};
