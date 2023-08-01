import type { AppEditType } from '@/types/app';

export const editModeMap = (isEdit: boolean) => {
  if (isEdit) {
    return {
      title: 'Update Application',
      applyBtnText: 'Update',
      applyMessage: 'Confirm Update Application?',
      applySuccess: 'Update Successful',
      applyError: 'Update Failed'
    };
  }

  return {
    title: 'Application Deployment',
    applyBtnText: 'Deploy',
    applyMessage: 'Confirm Deploy Application?',
    applySuccess: 'Deployment Successful',
    applyError: 'Deployment Failed'
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
  storeList: [],
  gpu: {
    manufacturers: 'nvidia',
    type: '',
    amount: 1
  }
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
