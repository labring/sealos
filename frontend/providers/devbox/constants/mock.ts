export const MockDevboxDetail = {
  id: 'be597c4b-8182-4aa3-87ca-2b8a5012e7f6',
  name: 'devbox-mock',
  templateUid: 'f34577f2-eca9-4a93-b6b6-9bc7fa2ec99f',
  templateName: '14.2.5',
  templateRepositoryName: 'Next.js',
  templateRepositoryUid: '593f9c34-9907-4543-a66f-27ba326ff620',
  templateConfig:
    '{"appPorts":[{"name":"ibhefgehzlzc","port":3000,"protocol":"TCP","targetPort":3000}],"ports":[{"containerPort":22,"name":"devbox-ssh-port","protocol":"TCP"}],"releaseArgs":["/home/devbox/project/entrypoint.sh"],"releaseCommand":["/bin/bash","-c"],"user":"devbox","workingDir":"/home/devbox/project"}',
  image: 'ghcr.io/labring-actions/devbox/next.js-14.2.5:22f026b',
  iconId: 'next.js',
  status: {
    label: 'Running',
    value: 'Running',
    color: '#039855',
    backgroundColor: '#EDFBF3',
    dotColor: '#039855'
  },
  sshPort: 49155,
  isPause: false,
  createTime: '2025-05-21 17:57',
  cpu: 2000,
  memory: 4096,
  gpu: {
    type: '',
    amount: 1,
    manufacturers: 'nvidia'
  },
  usedCpu: {
    name: '',
    xData: [],
    yData: []
  },
  usedMemory: {
    name: '',
    xData: [],
    yData: []
  },
  networks: [
    {
      portName: 'ibhefgehzlzc',
      port: 3000,
      protocol: 'HTTP',
      networkName: 'devbox-mock-enehrbwyaaww',
      openPublicDomain: true,
      publicDomain: 'flmfczhsqgjy.sealoshzh.site',
      customDomain: ''
    }
  ],
  lastTerminatedReason: ''
};

// Generate mock monitor data for CPU and Memory usage
export const generateMockMonitorData = (name: string = '') => {
  const now = Date.now();
  const xData: number[] = [];
  const yData: string[] = [];

  // Generate 30 data points, one for each minute
  for (let i = 0; i < 30; i++) {
    // Convert current time to seconds and subtract i minutes
    xData.push(Math.floor(now / 1000) - i * 60);

    // Generate random percentage between 0-100 with 2 decimal places
    const value = (Math.random() * 100).toFixed(2);
    yData.push(value);
  }

  // Reverse arrays so that older data comes first
  xData.reverse();
  yData.reverse();

  return {
    name,
    xData,
    yData
  };
};
