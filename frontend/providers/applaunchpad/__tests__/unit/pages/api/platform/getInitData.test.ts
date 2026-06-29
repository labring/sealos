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
    gpuEnabled: false,
    networkStorageEnabled: false
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
    imagePorts: {
      enabled: false
    },
    publicDomain: {
      customPrefixEnabled: false,
      reservedPrefixes: []
    },
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

  it('defaults new branch feature gates to disabled', () => {
    const env = getServerEnv(createConfig());

    expect(env.IMAGE_PORTS_ENABLED).toBe(false);
    expect(env.CUSTOM_PUBLIC_DOMAIN_PREFIX_ENABLED).toBe(false);
  });

  it('returns enabled branch feature gates from config', () => {
    const config = createConfig();
    config.launchpad.imagePorts = { enabled: true };
    config.launchpad.publicDomain = {
      customPrefixEnabled: true,
      reservedPrefixes: ['admin']
    };

    const env = getServerEnv(config);

    expect(env.IMAGE_PORTS_ENABLED).toBe(true);
    expect(env.CUSTOM_PUBLIC_DOMAIN_PREFIX_ENABLED).toBe(true);
    expect(env.PUBLIC_DOMAIN_RESERVED_PREFIXES).toEqual(['admin']);
  });

  it('returns custom domain certificate mode config', () => {
    const config = createConfig();
    config.launchpad.customDomain = {
      mode: 'certificate',
      certificate: {
        tlsSecretName: 'wildcard-cert',
        domains: [' App.Example.Local. ', '*.Apps.Example.Local']
      }
    };

    const env = getServerEnv(config);

    expect(env.CUSTOM_DOMAIN_MODE).toBe('certificate');
    expect(env.CUSTOM_DOMAIN_CERTIFICATE_SECRET_NAME).toBe('wildcard-cert');
    expect(env.CUSTOM_DOMAIN_CERTIFICATE_DOMAINS).toEqual([
      'app.example.local',
      '*.apps.example.local'
    ]);
  });

  it('defaults custom domain mode to cname', () => {
    const env = getServerEnv(createConfig());

    expect(env.CUSTOM_DOMAIN_MODE).toBe('cname');
    expect(env.CUSTOM_DOMAIN_CERTIFICATE_SECRET_NAME).toBe('wildcard-cert');
    expect(env.CUSTOM_DOMAIN_CERTIFICATE_DOMAINS).toEqual([]);
  });
});
