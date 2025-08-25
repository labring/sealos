import { PhaseEnum } from '@/types/cloudserver';

export const SliderList = {
  cpu: [
    {
      label: '0.1',
      value: 100
    },
    {
      label: '0.2',
      value: 200
    },
    {
      label: '0.5',
      value: 500
    },
    {
      label: '1',
      value: 1000
    },
    {
      label: '2',
      value: 2000
    },
    {
      label: '3',
      value: 3000
    },
    {
      label: '4',
      value: 4000
    },
    {
      label: '8',
      value: 8000
    }
  ],
  memory: [
    {
      label: '256 M',
      value: 256
    },
    {
      label: '512 M',
      value: 512
    },
    {
      label: '1 G',
      value: 1024
    },
    {
      label: '2 G',
      value: 2048
    },
    {
      label: '4 G',
      value: 4096
    },
    {
      label: '8 G',
      value: 8192
    },
    {
      label: '16 G',
      value: 16384
    },
    {
      label: '32 G',
      value: 32768
    }
  ]
};

export const MockInstanceType = [
  {
    CPU: 32,
    FPGA: 0,
    GPU: 0,
    GpuCount: 0,
    InstanceFamily: 'TS5',
    InstanceType: 'TS5.8XLARGE64',
    Memory: 64,
    Zone: 'ap-guangzhou-6'
  },
  {
    CPU: 16,
    FPGA: 0,
    GPU: 0,
    GpuCount: 0,
    InstanceFamily: 'TS5',
    InstanceType: 'TS5.4XLARGE32',
    Memory: 32,
    Zone: 'ap-guangzhou-6'
  },
  {
    CPU: 8,
    FPGA: 0,
    GPU: 0,
    GpuCount: 0,
    InstanceFamily: 'TS5',
    InstanceType: 'TS5.2XLARGE32',
    Memory: 32,
    Zone: 'ap-guangzhou-6'
  },
  {
    CPU: 8,
    FPGA: 0,
    GPU: 0,
    GpuCount: 0,
    InstanceFamily: 'TS5',
    InstanceType: 'TS5.2XLARGE16',
    Memory: 16,
    Zone: 'ap-guangzhou-6'
  },
  {
    CPU: 4,
    FPGA: 0,
    GPU: 0,
    GpuCount: 0,
    InstanceFamily: 'TS5',
    InstanceType: 'TS5.LARGE8',
    Memory: 8,
    Zone: 'ap-guangzhou-6'
  },
  {
    CPU: 4,
    FPGA: 0,
    GPU: 0,
    GpuCount: 0,
    InstanceFamily: 'TS5',
    InstanceType: 'TS5.LARGE16',
    Memory: 16,
    Zone: 'ap-guangzhou-6'
  },
  {
    CPU: 32,
    FPGA: 0,
    GPU: 0,
    GpuCount: 0,
    InstanceFamily: 'TS5',
    InstanceType: 'TS5.8XLARGE128',
    Memory: 128,
    Zone: 'ap-guangzhou-6'
  },
  {
    CPU: 16,
    FPGA: 0,
    GPU: 0,
    GpuCount: 0,
    InstanceFamily: 'TS5',
    InstanceType: 'TS5.4XLARGE64',
    Memory: 64,
    Zone: 'ap-guangzhou-6'
  },
  {
    CPU: 2,
    FPGA: 0,
    GPU: 0,
    GpuCount: 0,
    InstanceFamily: 'TS5',
    InstanceType: 'TS5.MEDIUM4',
    Memory: 4,
    Zone: 'ap-guangzhou-6'
  },
  {
    CPU: 2,
    FPGA: 0,
    GPU: 0,
    GpuCount: 0,
    InstanceFamily: 'TS5',
    InstanceType: 'TS5.MEDIUM8'
  }
];

export const MockStorages = [
  {
    id: '1',
    type: 'Hard Drive',
    size: '1TB',
    amount: '2',
    describe: 'Internal storage for desktop computer'
  },
  {
    id: '2',
    type: 'SSD',
    size: '500GB',
    amount: '1',
    describe: 'Solid-state drive for laptop'
  },
  {
    id: '1',
    type: 'External HDD',
    size: '2TB',
    amount: '3',
    describe: 'Portable storage for backup'
  },
  {
    type: 'USB Flash Drive',
    size: '64GB',
    amount: '5',
    describe: 'Removable storage for transferring files'
  }
];

export const MockImage = [
  {
    name: 'OpenCloudOS',
    type: 'Linux',
    description: 'An open-source cloud operating system designed for scalability and flexibility.',
    logo: 'https://example.com/opencloudos.png'
  },
  {
    name: 'TencentOS',
    type: 'Linux',
    description:
      'A Linux distribution developed by Tencent, optimized for cloud computing and internet services.',
    logo: 'https://example.com/tencentos.png'
  },
  {
    name: 'CentOS',
    type: 'Linux',
    description:
      'A free and open-source Linux distribution based on Red Hat Enterprise Linux (RHEL).',
    logo: 'https://example.com/centos.png'
  },
  {
    name: 'Windows',
    type: 'Windows',
    description:
      'A popular operating system developed by Microsoft, widely used for personal computers.',
    logo: 'https://example.com/windows.png'
  },
  {
    name: 'Ubuntu',
    type: 'Linux',
    description:
      'A user-friendly Linux distribution based on Debian, known for its ease of use and community support.',
    logo: 'https://example.com/ubuntu.png'
  },
  {
    name: 'Debian',
    type: 'Linux',
    description:
      'A stable and versatile Linux distribution, widely used as a base for other distributions.',
    logo: 'https://example.com/debian.png'
  },
  {
    name: 'CentOS Stream',
    type: 'Linux',
    description: 'A rolling-release Linux distribution that serves as a testing ground for RHEL.',
    logo: 'https://example.com/centos-stream.png'
  },
  {
    name: 'AlmaLinux',
    type: 'Linux',
    description:
      'A community-driven Linux distribution designed as a drop-in replacement for CentOS.',
    logo: 'https://example.com/almalinux.png'
  },
  {
    name: 'CoreOS',
    type: 'Linux',
    description:
      'A lightweight Linux distribution designed for containerized applications and cloud deployments.',
    logo: 'https://example.com/coreos.png'
  },
  {
    name: 'openSUSE',
    type: 'Linux',
    description:
      'A general-purpose Linux distribution known for its stability and comprehensive package management.',
    logo: 'https://example.com/opensuse.png'
  },
  {
    name: 'Rocky Linux',
    type: 'Linux',
    description:
      'A community-driven enterprise-grade Linux distribution, created as a replacement for CentOS.',
    logo: 'https://example.com/rockylinux.png'
  },
  {
    name: 'FreeBSD',
    type: 'BSD',
    description:
      'A free and open-source Unix-like operating system based on the Berkeley Software Distribution (BSD).',
    logo: 'https://example.com/freebsd.png'
  },
  {
    name: 'Fedora',
    type: 'Linux',
    description:
      'A cutting-edge Linux distribution sponsored by Red Hat, known for its frequent updates and new features.',
    logo: 'https://example.com/fedora.png'
  }
];

export const MockInstance = [
  {
    _id: '60a7e9e8c8e8a5001f9e8a5a',
    phase: 'Running',
    state: 'Active',
    namespace: 'default',
    sealosUserId: '123456',
    cpu: 4,
    disk: 100,
    memory: 8192,
    publicNetworkAccess: true,
    instanceId: 'i-1234567890',
    ImageId: 'ami-12345678',
    InstanceName: 'MyVM1',
    loginName: 'admin',
    loginPassword: 'password123',
    cloudProvider: 'AWS'
  },
  {
    _id: '60a7e9e8c8e8a5001f9e8a5b',
    phase: 'Stopped',
    state: 'Inactive',
    namespace: 'default',
    sealosUserId: '789012',
    cpu: 2,
    disk: 50,
    memory: 4096,
    publicNetworkAccess: false,
    instanceId: 'i-0987654321',
    ImageId: 'ami-87654321',
    InstanceName: 'MyVM2',
    loginName: 'admin',
    loginPassword: 'password456',
    cloudProvider: 'Azure'
  }
];

export const StatusMap = {
  [PhaseEnum.Starting]: {
    label: 'Starting',
    value: PhaseEnum.Starting,
    color: 'green.600',
    backgroundColor: 'green.50',
    dotColor: 'green.600'
  },
  [PhaseEnum.Started]: {
    label: 'Started',
    value: PhaseEnum.Started,
    color: 'green.600',
    backgroundColor: 'green.50',
    dotColor: 'green.600'
  },
  [PhaseEnum.Creating]: {
    label: 'Creating',
    value: PhaseEnum.Creating,
    color: 'grayModern.500',
    backgroundColor: 'grayModern.100',
    dotColor: 'grayModern.500'
  },
  [PhaseEnum.Created]: {
    label: 'Created',
    value: PhaseEnum.Created,
    color: 'grayModern.500',
    backgroundColor: 'grayModern.100',
    dotColor: 'grayModern.500'
  },
  [PhaseEnum.Deleted]: {
    label: 'Deleted',
    value: PhaseEnum.Deleted,
    color: 'rgba(240, 68, 56, 1)',
    backgroundColor: 'rgba(254, 243, 242, 1)',
    dotColor: 'rgba(240, 68, 56, 1)'
  },
  [PhaseEnum.Deleting]: {
    label: 'Deleting',
    value: PhaseEnum.Deleting,
    color: 'rgba(240, 68, 56, 1)',
    backgroundColor: 'rgba(254, 243, 242, 1)',
    dotColor: 'rgba(240, 68, 56, 1)'
  },
  [PhaseEnum.Stopped]: {
    label: 'Stopped',
    value: PhaseEnum.Stopped,
    color: 'rgba(111, 93, 215, 1)',
    backgroundColor: 'rgba(240, 238, 255, 1)',
    dotColor: 'rgba(111, 93, 215, 1)'
  },
  [PhaseEnum.Stopping]: {
    label: 'Stopping',
    value: PhaseEnum.Stopping,
    color: 'rgba(111, 93, 215, 1)',
    backgroundColor: 'rgba(240, 238, 255, 1)',
    dotColor: 'rgba(111, 93, 215, 1)'
  },
  [PhaseEnum.Changing]: {
    label: 'Changing',
    value: PhaseEnum.Changing,
    color: 'grayModern.500',
    backgroundColor: 'grayModern.100',
    dotColor: 'grayModern.500'
  },
  [PhaseEnum.Restarting]: {
    label: 'Restarting',
    value: PhaseEnum.Restarting,
    color: 'grayModern.500',
    backgroundColor: 'grayModern.100',
    dotColor: 'grayModern.500'
  }
};
