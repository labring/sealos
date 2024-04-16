import type { AppEditType } from '@/types/app';
import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

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
    applyBtnText: 'Deploy Application',
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
  networks: [
    {
      networkName: '',
      portName: nanoid(),
      port: 80,
      protocol: 'HTTP',
      openPublicDomain: false,
      publicDomain: '',
      customDomain: ''
    }
  ],
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
