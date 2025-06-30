import { DevboxDetailType, DevboxEditType, DevboxEditTypeV2 } from '@/types/devbox';

export const defaultSliderKey = 'default';
export const crLabelKey = 'sealos-devbox-cr';
export const gpuResourceKey = 'nvidia.com/gpu';
export const devboxKey = 'cloud.sealos.io/devbox-manager';
export const gpuNodeSelectorKey = 'nvidia.com/gpu.product';
export const devboxIdKey = 'cloud.sealos.io/app-devbox-id';
export const ingressProtocolKey = 'nginx.ingress.kubernetes.io/backend-protocol';
export const publicDomainKey = `cloud.sealos.io/app-deploy-manager-domain`;

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
  Stopped = 'Stopped', // normal
  Shutdown = 'Shutdown', // cold: delete service
  Running = 'Running',
  Pending = 'Pending',
  Error = 'Error',
  Delete = 'Delete',
  Unknown = 'Unknown'
}
export enum DevboxReleaseStatusEnum {
  Success = 'Success',
  Pending = 'Pending',
  Failed = 'Failed'
}
export const CpuSlideMarkList = [
  { label: 1, value: 1000 },
  { label: 2, value: 2000 },
  { label: 4, value: 4000 },
  { label: 8, value: 8000 },
  { label: 16, value: 16000 }
];

export const MemorySlideMarkList = [
  // { label: '512Mi', value: 512 },
  // { label: '1G', value: 1024 },
  { label: '2', value: 2048 },
  { label: '4', value: 4096 },
  // { label: '6G', value: 6144 },
  { label: '8', value: 8192 },
  // { label: '12G', value: 12288 },
  { label: '16', value: 16384 },
  { label: '32', value: 32768 }
];

export const defaultDevboxEditValue: DevboxEditType = {
  name: 'devbox',
  runtimeType: LanguageTypeEnum.go,
  runtimeVersion: '',
  cpu: CpuSlideMarkList[1].value,
  memory: MemorySlideMarkList[1].value,
  networks: []
};
export const defaultDevboxEditValueV2: DevboxEditTypeV2 = {
  name: 'devbox',
  image: '',
  templateConfig: '{}',
  templateRepositoryUid: '',
  templateUid: '',
  cpu: CpuSlideMarkList[1].value,
  memory: MemorySlideMarkList[1].value,
  networks: []
};

// TODO: should delete this map,we don not need this in backend
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
  [DevboxStatusEnum.Shutdown]: {
    label: 'Shutdown',
    value: DevboxStatusEnum.Shutdown,
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
    label: 'Delete',
    value: DevboxStatusEnum.Delete,
    color: '#DC6803',
    backgroundColor: '#FFFAEB',
    dotColor: '#DC6803'
  },
  [DevboxStatusEnum.Unknown]: {
    label: 'Unknown',
    value: DevboxStatusEnum.Unknown,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  }
};

export const devboxReleaseStatusMap = {
  [DevboxReleaseStatusEnum.Success]: {
    label: 'release_success',
    value: DevboxReleaseStatusEnum.Success,
    color: '#039855',
    backgroundColor: '#EDFBF3',
    dotColor: '#039855'
  },
  [DevboxReleaseStatusEnum.Pending]: {
    label: 'release_pending',
    value: DevboxReleaseStatusEnum.Pending,
    color: '#0884DD',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  },
  [DevboxReleaseStatusEnum.Failed]: {
    label: 'release_failed',
    value: DevboxReleaseStatusEnum.Failed,
    color: '#D92D20',
    backgroundColor: '#FEF3F2',
    dotColor: '#F04438'
  }
};

export const editModeMap: (isEdit: boolean) => {
  [key: string]: string;
} = (isEdit: boolean) => {
  if (isEdit) {
    return {
      title: 'update_devbox',
      applyBtnText: 'update',
      applyMessage: 'confirm_update_devbox',
      applySuccess: 'update_success',
      applyError: 'update_failed'
    };
  }

  return {
    title: 'config_devbox',
    applyBtnText: 'create',
    applyMessage: 'confirm_create_devbox',
    applySuccess: 'create_success',
    applyError: 'create_failed'
  };
};

export const defaultDevboxDetail: DevboxDetailType = {
  ...defaultDevboxEditValue,
  id: '',
  createTime: '2024/8/9',
  status: devboxStatusMap.Running,
  upTime: '20h',
  isPause: false,
  usedCpu: {
    name: 'usedCpu',
    xData: [
      1691583720000, // '2024-08-09 12:02'
      1691583780000, // '2024-08-09 12:03'
      1691583840000, // '2024-08-09 12:04'
      1691583900000, // '2024-08-09 12:05'
      1691583960000 // '2024-08-09 12:06'
    ],
    yData: ['0.1', '0.2', '0.3', '0.4', '0.5']
  },
  usedMemory: {
    name: 'usedMemory',
    xData: [
      1691583720000, // '2024-08-09 12:02'
      1691583780000, // '2024-08-09 12:03'
      1691583840000, // '2024-08-09 12:04'
      1691583900000, // '2024-08-09 12:05'
      1691583960000 // '2024-08-09 12:06'
    ],
    yData: ['0.1', '0.2', '0.3', '0.4', '0.5']
  },
  sshConfig: {
    sshUser: '',
    sshDomain: '',
    sshPort: 0,
    token: '',
    sshPrivateKey: ''
  }
};

export const ProtocolList = [
  { value: 'HTTP', label: 'https://' },
  { value: 'GRPC', label: 'grpcs://' },
  { value: 'WS', label: 'wss://' }
];

export enum YamlKindEnum {
  Devbox = 'Devbox',
  Service = 'Service',
  Ingress = 'Ingress',
  Issuer = 'Issuer',
  Certificate = 'Certificate'
}

export enum PodStatusEnum {
  waiting = 'waiting',
  running = 'running',
  terminated = 'terminated'
}

export const podStatusMap = {
  [PodStatusEnum.running]: {
    label: 'running',
    value: PodStatusEnum.running,
    color: 'green.600'
  },
  [PodStatusEnum.waiting]: {
    label: 'waiting',
    value: PodStatusEnum.waiting,
    color: '#787A90',
    reason: '',
    message: ''
  },
  [PodStatusEnum.terminated]: {
    label: 'terminated',
    value: PodStatusEnum.terminated,
    color: '#8172D8',
    reason: '',
    message: ''
  }
};

export const GpuAmountMarkList = [
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 },
  { label: '5', value: 5 },
  { label: '6', value: 6 },
  { label: '7', value: 7 },
  { label: '8', value: 8 }
];
