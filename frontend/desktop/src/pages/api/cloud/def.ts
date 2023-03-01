import type { IframePage } from '../../../interfaces/cloud';

export const urls: Map<string, IframePage> = new Map([
  [
    'kubernetes',
    {
      title: 'kubernetes-dashboard-cloud-sealos-io',
      url: 'https://kubernetes-dashboard.cloud.sealos.io/',
      icon: '/images/kubernetes.svg'
    }
  ],
  [
    'terminal',
    {
      title: 'terminal-cloud-sealos-io',
      url: 'https://terminal.cloud.sealos.io/',
      icon: '/images/terminal.svg'
    }
  ],
  [
    'mysql',
    {
      title: 'mysql-cloud-sealos-io',
      url: '',
      icon: '/images/mysql.svg'
    }
  ],
  [
    'redis',
    {
      title: 'redis-cloud-sealos-io',
      url: '',
      icon: '/images/redis.svg'
    }
  ]
]);
