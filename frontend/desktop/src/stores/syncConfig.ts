import { LayoutConfigType } from '@/types';
import config from 'data/config.json';

const configRead: { layout: LayoutConfigType } = config;

export const DefaultLayoutConfig: LayoutConfigType = {
  title: 'Sealos Cloud',
  logo: '/logo.svg',
  backgroundImage: '/images/bg-blue.svg',
  protocol: {
    serviceProtocol: {
      zh: '',
      en: ''
    },
    privateProtocol: {
      zh: '',
      en: ''
    }
  },
  currencySymbol: 'shellCoin',
  meta: {
    title: 'Sealos Cloud',
    description: 'Sealos Cloud',
    keywords: 'Sealos Cloud',
    scripts: []
  },
  common: {
    githubStarEnabled: false,
    workorderEnabled: false,
    accountSettingEnabled: false,
    aiAssistantEnabled: false
  }
};

const exportConfig = {
  layout: {
    ...DefaultLayoutConfig,
    ...configRead.layout
  }
};

export { exportConfig as configObj };
