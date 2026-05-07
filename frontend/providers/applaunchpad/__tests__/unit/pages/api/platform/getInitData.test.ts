import { describe, expect, it } from 'vitest';
import { Coin } from '@/constants/app';
import { getServerEnv } from '@/pages/api/platform/getInitData';
import type { AppConfigType } from '@/types';

const createConfig = (): AppConfigType => ({
  cloud: {
    domain: 'cloud.example.com',
    port: ':443',
    httpPort: ':80',
    disableHttps: true,
    userDomains: [{ name: 'cloud.example.com', secretName: 'wildcard-cert' }],
    desktopDomain: 'cloud.example.com'
  },
  common: {
    guideEnabled: false,
    apiEnabled: false,
    gpuEnabled: false
  },
  launchpad: {
    infrastructure: {
      provider: 'alibaba',
      requiresDomainReg: false,
      domainRegQueryLink: '',
      domainBindingDocumentationLink: null
    },
    domainChallengeSecret: 'secret',
    meta: {
      title: 'Launchpad',
      description: 'Launchpad',
      scripts: []
    },
    gtmId: null,
    currencySymbol: Coin.shellCoin,
    pvcStorageMax: 20,
    eventAnalyze: {
      enabled: false
    },
    components: {
      monitor: { url: '' },
      billing: { url: '' },
      log: { url: '' }
    },
    appResourceFormSliderConfig: {},
    fileManger: {
      uploadLimit: 50,
      downloadLimit: 100
    },
    checkIcpReg: {
      enabled: false,
      endpoint: '',
      accessKeyID: '',
      accessKeySecret: ''
    }
  }
});

describe('getServerEnv', () => {
  it('returns http-only launchpad config fields', () => {
    const env = getServerEnv(createConfig());

    expect(env.DOMAIN_PORT).toBe(':443');
    expect(env.HTTP_PORT).toBe(':80');
    expect(env.DISABLE_HTTPS).toBe(true);
  });
});
