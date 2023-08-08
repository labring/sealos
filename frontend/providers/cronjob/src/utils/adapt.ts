import type { AutoBackupFormType } from '@/types/backup';
import type { KubeBlockBackupPolicyType } from '@/types/cluster';
import { CronJobListItemType, CronJobResultType } from '@/types/job';
import { convertCronTime } from '@/utils/tools';
import dayjs from 'dayjs';

export const adaptPolicy = (policy: KubeBlockBackupPolicyType): AutoBackupFormType => {
  function parseDate(str: string) {
    const regex = /(\d+)([a-zA-Z]+)/;
    const matches = str.match(regex);

    if (matches && matches.length === 3) {
      const number = parseInt(matches[1]);
      const unit = matches[2];

      return { number, unit };
    }

    return { number: 7, unit: 'd' };
  }
  function parseCron(str: string) {
    const cronFields = convertCronTime(str, 8).split(' ');
    const minuteField = cronFields[0];
    const hourField = cronFields[1];
    const weekField = cronFields[4];

    //  week task
    if (weekField !== '*') {
      return {
        hour: hourField.padStart(2, '0'),
        minute: minuteField.padStart(2, '0'),
        week: weekField.split(','),
        type: 'week'
      };
    }
    console.log(minuteField, hourField, weekField);

    // every day
    if (hourField !== '*') {
      return {
        hour: hourField.padStart(2, '0'),
        minute: minuteField.padStart(2, '0'),
        week: [],
        type: 'day'
      };
    }

    // every hour
    if (minuteField !== '*') {
      return {
        hour: '00',
        minute: minuteField.padStart(2, '0'),
        week: [],
        type: 'hour'
      };
    }

    return {
      hour: '18',
      minute: '00',
      week: [],
      type: 'day'
    };
  }

  const { number: saveTime, unit: saveType } = parseDate(policy.spec.retention.ttl);
  const { hour, minute, week, type } = parseCron(policy.spec.schedule.datafile.cronExpression);

  return {
    start: policy.spec.schedule.datafile.enable,
    type,
    week,
    hour,
    minute,
    saveTime,
    saveType
  };
};

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
