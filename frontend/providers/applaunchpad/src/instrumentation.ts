import type { AppConfigType } from './types';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const Coin = (await import('@/constants/app')).Coin;
    const yaml = (await import('js-yaml')).default;
    const fs = (await import('node:fs')).default;
    const getGpuNode = (await import('./services/backend/gpu')).getGpuNode;

    async function loadConfig() {
      const defaultAppConfig: AppConfigType = {
        cloud: {
          domain: 'cloud.sealos.io',
          port: '',
          userDomains: [
            {
              name: 'cloud.sealos.io',
              secretName: 'wildcard-cert'
            }
          ],
          desktopDomain: 'cloud.sealos.io'
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
            domainRegQueryLink: 'http://localhost:3000',
            domainBindingDocumentationLink: null
          },
          domainChallengeSecret: 'default-dev-secret-change-in-production',
          meta: {
            title: 'Sealos Desktop App Demo',
            description: 'Sealos Desktop App Demo',
            scripts: []
          },
          gtmId: null,
          currencySymbol: Coin.shellCoin,
          pvcStorageMax: 20,
          eventAnalyze: {
            enabled: false,
            fastGPTKey: ''
          },
          components: {
            monitor: {
              url: 'http://launchpad-monitor.sealos.svc.cluster.local:8428'
            },
            billing: {
              url: 'http://account-service.account-system.svc:2333'
            },
            log: {
              url: 'http://localhost:8080'
            }
          },
          appResourceFormSliderConfig: {
            default: {
              cpu: [100, 200, 500, 1000, 2000, 3000, 4000, 8000],
              memory: [64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384]
            },
            'default-gpu': {
              cpu: [8000, 16000, 32000, 48000, 64000, 80000, 108000],
              memory: [16384, 32768, 65536, 131072, 262144, 524288, 614400]
            }
          },
          fileManger: {
            uploadLimit: 5,
            downloadLimit: 100
          }
        }
      };

      const filename =
        process.env.NODE_ENV === 'development' ? 'data/config.yaml.local' : '/app/data/config.yaml';
      const res: any = yaml.load(fs.readFileSync(filename, 'utf-8'));
      const config = {
        ...defaultAppConfig,
        ...res
      };
      global.AppConfig = config;
      const gpuNodes = await getGpuNode();
      console.log(gpuNodes, 'gpuNodes');
      global.AppConfig.common.gpuEnabled = gpuNodes.length > 0;
    }

    console.log('[Instrumentation Hook] Loading AppConfig from disk.');
    await loadConfig();
  }
}
