import { DevboxEditType, DevboxDetailType } from '@/types/devbox'

export const crLabelKey = 'sealos-devbox-cr'

export enum RuntimeEnum {
  java = 'java',
  go = 'go',
  python = 'python',
  node = 'node',
  rust = 'rust',
  php = 'php',
  custom = 'custom'
}
export const RuntimeTypeList = [
  { id: RuntimeEnum.java, label: 'java' },
  { id: RuntimeEnum.go, label: 'go' },
  { id: RuntimeEnum.python, label: 'python' },
  { id: RuntimeEnum.node, label: 'node' },
  { id: RuntimeEnum.rust, label: 'rust' },
  { id: RuntimeEnum.php, label: 'php' },
  { id: RuntimeEnum.custom, label: 'custom' }
]

export enum DBTypeEnum {
  postgresql = 'postgresql',
  mongodb = 'mongodb',
  mysql = 'apecloud-mysql',
  redis = 'redis',
  kafka = 'kafka',
  qdrant = 'qdrant',
  nebula = 'nebula',
  weaviate = 'weaviate',
  milvus = 'milvus'
}

export enum DevboxStatusEnum {
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
  Deleting = 'Deleting'
}

export const CpuSlideMarkList = [
  { label: 0.5, value: 500 },
  { label: 1, value: 1000 },
  { label: 2, value: 2000 },
  { label: 3, value: 3000 },
  { label: 4, value: 4000 },
  { label: 5, value: 5000 },
  { label: 6, value: 6000 },
  { label: 7, value: 7000 },
  { label: 8, value: 8000 }
]

export const MemorySlideMarkList = [
  { label: '512Mi', value: 512 },
  { label: '1G', value: 1024 },
  { label: '2G', value: 2048 },
  { label: '4G', value: 4096 },
  { label: '6G', value: 6144 },
  { label: '8G', value: 8192 },
  { label: '12G', value: 12288 },
  { label: '16G', value: 16384 },
  { label: '32G', value: 32768 }
]

export const defaultDevboxEditValue: DevboxEditType = {
  devboxName: '',
  runtimeType: RuntimeEnum.java,
  runtimeVersion: '',
  cpu: CpuSlideMarkList[1].value,
  memory: MemorySlideMarkList[1].value
}

export const devboxStatusMap = {
  [DevboxStatusEnum.Creating]: {
    label: 'Creating',
    value: DevboxStatusEnum.Creating,
    color: 'grayModern.500',
    backgroundColor: 'rgba(17, 24, 36, 0.05)',
    dotColor: 'grayModern.500'
  },
  [DevboxStatusEnum.Starting]: {
    label: 'Starting',
    value: DevboxStatusEnum.Starting,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  },
  [DevboxStatusEnum.Stopping]: {
    label: 'Pausing',
    value: DevboxStatusEnum.Stopping,
    color: '#6F5DD7',
    backgroundColor: '#F0EEFF',
    dotColor: '#6F5DD7'
  },
  [DevboxStatusEnum.Stopped]: {
    label: 'Paused',
    value: DevboxStatusEnum.Stopped,
    color: '#8172D8',
    backgroundColor: '#F2F1FB',
    dotColor: '#8172D8'
  },
  [DevboxStatusEnum.Running]: {
    label: 'Running',
    value: DevboxStatusEnum.Running,
    color: '#039855',
    backgroundColor: '#EDFBF3',
    dotColor: '#039855'
  },
  [DevboxStatusEnum.Updating]: {
    label: 'Updating',
    value: DevboxStatusEnum.Updating,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  },
  [DevboxStatusEnum.SpecUpdating]: {
    label: 'Updating',
    value: DevboxStatusEnum.SpecUpdating,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  },
  [DevboxStatusEnum.Rebooting]: {
    label: 'Restarting',
    value: DevboxStatusEnum.Rebooting,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  },
  [DevboxStatusEnum.Upgrade]: {
    label: 'Updating',
    value: DevboxStatusEnum.Upgrade,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  },
  [DevboxStatusEnum.VerticalScaling]: {
    label: 'Updating',
    value: DevboxStatusEnum.VerticalScaling,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  },
  [DevboxStatusEnum.VolumeExpanding]: {
    label: 'Updating',
    value: DevboxStatusEnum.VolumeExpanding,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  },
  [DevboxStatusEnum.Failed]: {
    label: 'Failed',
    value: DevboxStatusEnum.Failed,
    color: '#F04438',
    backgroundColor: '#FEF3F2',
    dotColor: '#F04438'
  },
  [DevboxStatusEnum.UnKnow]: {
    label: 'Creating',
    value: DevboxStatusEnum.UnKnow,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  },
  [DevboxStatusEnum.Deleting]: {
    label: 'Deleting',
    value: DevboxStatusEnum.Deleting,
    color: '#DC6803',
    backgroundColor: '#FFFAEB',
    dotColor: '#DC6803'
  }
}

export const defaultDevboxDetail: DevboxDetailType = {
  ...defaultDevboxEditValue,
  id: '',
  createTime: '2024/8/9',
  status: devboxStatusMap.Creating,
  labels: {}
}