import type { AppEditType } from '@/types/app';

export const editModeMap = (isEdit: boolean) => {
  if (isEdit) {
    return {
      title: '变更应用',
      applyBtnText: '更新应用',
      applyMessage: '确认更新应用?',
      applySuccess: '更新成功',
      applyError: '更新失败'
    };
  }

  return {
    title: '应用部署',
    applyBtnText: '部署应用',
    applyMessage: '确认部署应用?',
    applySuccess: '部署成功',
    applyError: '部署失败'
  };
};

export const defaultEditVal: AppEditType = {
  appName: 'hello-world',
  imageName: 'nginx',
  runCMD: '',
  cmdParam: '',
  replicas: 1,
  cpu: 100,
  memory: 64,
  containerOutPort: 80,
  accessExternal: {
    use: false,
    backendProtocol: 'HTTP',
    outDomain: '',
    selfDomain: ''
  },
  envs: [],
  hpa: {
    use: false,
    target: 'cpu',
    value: 50,
    minReplicas: 1,
    maxReplicas: 5
  },
  configMapList: [],
  secret: {
    use: false,
    username: '',
    password: '',
    serverAddress: 'docker.io'
  },
  storeList: []
};

export const CpuSlideMarkList = [
  // The unit of value is m
  { label: 0.1, value: 100 },
  { label: 0.2, value: 200 },
  { label: 0.5, value: 500 },
  { label: 1, value: 1000 },
  { label: 2, value: 2000 },
  { label: 3, value: 3000 },
  { label: 4, value: 4000 },
  { label: 8, value: 8000 }
];

export const MemorySlideMarkList = [
  { label: '64Mi', value: 64 },
  { label: '128Mi', value: 128 },
  { label: '256Mi', value: 256 },
  { label: '512Mi', value: 512 },
  { label: '1G', value: 1024 },
  { label: '2G', value: 2048 },
  { label: '4G', value: 4096 },
  { label: '8G', value: 8192 },
  { label: '16G', value: 16384 }
];
