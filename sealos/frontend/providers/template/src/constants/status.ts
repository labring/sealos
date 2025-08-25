export enum StatusEnum {
  Creating = 'Creating',
  Starting = 'Starting',
  Stopping = 'Stopping',
  Stopped = 'Stopped',
  Running = 'Running',
  Updating = 'Updating',
  SpecUpdating = 'SpecUpdating',
  Rebooting = 'Rebooting',
  Upgrade = 'Upgrade',
  VerticalScaling = 'VerticalScaling',
  VolumeExpanding = 'VolumeExpanding',
  Failed = 'Failed',
  UnKnow = 'UnKnow',
  Waiting = 'Waiting',
  Deleting = 'Deleting'
}
export const StatusMap = {
  [StatusEnum.Waiting]: {
    label: 'Waiting',
    value: StatusEnum.Waiting,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  },
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
  },
  [StatusEnum.Deleting]: {
    label: 'Deleting',
    value: StatusEnum.Deleting,
    color: '#DC6803',
    backgroundColor: '#FFFAEB',
    dotColor: '#DC6803'
  }
};
