import { CronJobEditType } from '@/types/job';

export const CronJobTypeList = [
  { id: 'url', label: 'Form.Visit Url' },
  { id: 'launchpad', label: 'Form.Expansion and Contraction Launchpad' },
  { id: 'image', label: 'Form.Execution Image' }
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

export enum StatusEnum {
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

export const CronJobStatusMap = {
  [StatusEnum.Creating]: {
    label: 'Creating',
    value: StatusEnum.Creating,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  },
  [StatusEnum.Starting]: {
    label: 'Starting',
    value: StatusEnum.Starting,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  },
  [StatusEnum.Stopping]: {
    label: 'Pausing',
    value: StatusEnum.Stopping,
    color: '#8172D8',
    backgroundColor: '#F2F1FB',
    dotColor: '#8172D8'
  },
  [StatusEnum.Stopped]: {
    label: 'Paused',
    value: StatusEnum.Stopped,
    color: '#8172D8',
    backgroundColor: '#F2F1FB',
    dotColor: '#8172D8'
  },
  [StatusEnum.Running]: {
    label: 'Running',
    value: StatusEnum.Running,
    color: '#00A9A6',
    backgroundColor: '#E6F6F6',
    dotColor: '#00A9A6'
  },
  [StatusEnum.Updating]: {
    label: 'Updating',
    value: StatusEnum.Updating,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  },
  [StatusEnum.SpecUpdating]: {
    label: 'Updating',
    value: StatusEnum.SpecUpdating,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  },
  [StatusEnum.Rebooting]: {
    label: 'Restarting',
    value: StatusEnum.Rebooting,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  },
  [StatusEnum.Upgrade]: {
    label: 'Updating',
    value: StatusEnum.Upgrade,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  },
  [StatusEnum.VerticalScaling]: {
    label: 'Updating',
    value: StatusEnum.VerticalScaling,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  },
  [StatusEnum.VolumeExpanding]: {
    label: 'Updating',
    value: StatusEnum.VolumeExpanding,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  },
  [StatusEnum.Failed]: {
    label: 'Failed',
    value: StatusEnum.Failed,
    color: '#FF5B6E',
    backgroundColor: '#FFEBED',
    dotColor: '#FF5B6E'
  },
  [StatusEnum.UnKnow]: {
    label: 'Creating',
    value: StatusEnum.UnKnow,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  }
};

export const DefaultJobEditValue: CronJobEditType = {
  jobType: 'launchpad',
  jobName: '',
  schedule: '0 * * * *',
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
  url: '',
  enableNumberCopies: true,
  enableResources: true,
  replicas: 1,
  cpu: 0,
  memory: 0,
  launchpadName: '',
  launchpadId: '',
  serviceAccountName: '',
  status: CronJobStatusMap['Running'],
  isPause: false,
  creatTime: '',
  _schedule: '',
  nextExecutionTime: ''
};
