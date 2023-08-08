import { CronJobEditType } from '@/types/job';

export const JobTypeList = [
  { id: 'test', label: 'test' },
  { id: 'test2', label: 'test2' }
];

export const SelectTimeList = <
  {
    id: string;
    label: string;
  }[]
>(() =>
  new Array(60).fill(0).map((item, i) => {
    const val = i < 10 ? `0${i}` : `${i}`;
    return {
      id: val,
      label: val
    };
  }))();

export const WeekSelectList = [
  { label: 'Monday', id: '1' },
  { label: 'Tuesday', id: '2' },
  { label: 'Wednesday', id: '3' },
  { label: 'Thursday', id: '4' },
  { label: 'Friday', id: '5' },
  { label: 'Saturday', id: '6' },
  { label: 'Sunday', id: '0' }
];

export const DefaultJobEditValue: CronJobEditType = {
  jobType: '',
  JobName: '',
  schedule: '* * * * *',
  imageName: '',
  runCMD: '',
  cmdParam: '',
  secret: {
    use: false,
    username: '',
    password: '',
    serverAddress: 'docker.io'
  },
  envs: [],
  scheduleType: 'hour',
  week: [],
  hour: '*',
  minute: '*'
};

export enum CronJobStatusEnum {
  Suspend = 'Suspend',
  Running = 'Running',
  Creating = 'Creating',
  Starting = 'Starting',
  Stopping = 'Stopping',
  Stopped = 'Stopped',
  Updating = 'Updating',
  SpecUpdating = 'SpecUpdating',
  Rebooting = 'Rebooting',
  Upgrade = 'Upgrade',
  VerticalScaling = 'VerticalScaling',
  VolumeExpanding = 'VolumeExpanding',
  Failed = 'Failed',
  UnKnow = 'UnKnow'
}
