import { DevboxEditType, DevboxDetailType } from '@/types/devbox'

export const crLabelKey = 'sealos-devbox-cr'
export const devboxKey = 'cloud.sealos.io/devbox-manager'
export const publicDomainKey = `cloud.sealos.io/app-deploy-manager-domain`

export enum LanguageTypeEnum {
  java = 'java',
  go = 'go',
  python = 'python',
  node = 'node',
  rust = 'rust',
  c = 'c'
}
export enum FrameworkTypeEnum {
  gin = 'gin',
  Hertz = 'Hertz',
  springBoot = 'spring-boot',
  flask = 'flask',
  nextjs = 'nextjs',
  vue = 'vue'
}
export enum OSTypeEnum {
  ubuntu = 'ubuntu',
  centos = 'centos'
}
export enum RuntimeTypeEnum {
  language = 'language',
  framework = 'framework',
  os = 'os'
}

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
  Stopping = 'Stopping',
  Stopped = 'Stopped',
  Running = 'Running',
  Pending = 'Pending',
  Error = 'Error',
  Delete = 'Delete'
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
  name: '',
  runtimeType: LanguageTypeEnum.go,
  runtimeVersion: '',
  cpu: CpuSlideMarkList[1].value,
  memory: MemorySlideMarkList[1].value,
  networks: []
}

export const devboxStatusMap = {
  [DevboxStatusEnum.Stopping]: {
    label: 'Stopping',
    value: DevboxStatusEnum.Stopping,
    color: '#6F5DD7',
    backgroundColor: '#F0EEFF',
    dotColor: '#6F5DD7'
  },
  [DevboxStatusEnum.Stopped]: {
    label: 'Stopped',
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
  [DevboxStatusEnum.Pending]: {
    label: 'Pending',
    value: DevboxStatusEnum.Pending,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  },
  [DevboxStatusEnum.Error]: {
    label: 'Error',
    value: DevboxStatusEnum.Error,
    color: '#F04438',
    backgroundColor: '#FEF3F2',
    dotColor: '#F04438'
  },
  [DevboxStatusEnum.Delete]: {
    label: 'Deleting',
    value: DevboxStatusEnum.Delete,
    color: '#DC6803',
    backgroundColor: '#FFFAEB',
    dotColor: '#DC6803'
  }
}

export const editModeMap: (isEdit: boolean) => {
  [key: string]: string
} = (isEdit: boolean) => {
  if (isEdit) {
    return {
      title: 'update_devbox',
      applyBtnText: 'update',
      applyMessage: 'confirm_update_devbox',
      applySuccess: 'update_success',
      applyError: 'update_failed'
    }
  }

  return {
    title: 'create_devbox',
    applyBtnText: 'create',
    applyMessage: 'confirm_create_devbox',
    applySuccess: 'create_success',
    applyError: 'create_failed'
  }
}

export const defaultDevboxDetail: DevboxDetailType = {
  ...defaultDevboxEditValue,
  id: '',
  createTime: '2024/8/9',
  status: devboxStatusMap.Running
}

export const ProtocolList = [
  { value: 'HTTP', label: 'https://' },
  { value: 'GRPC', label: 'grpcs://' },
  { value: 'WS', label: 'wss://' }
]

export enum YamlKindEnum {
  Devbox = 'Devbox',
  Service = 'Service',
  Ingress = 'Ingress',
  Issuer = 'Issuer',
  Certificate = 'Certificate'
}
