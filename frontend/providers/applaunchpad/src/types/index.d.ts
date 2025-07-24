import { WstLogger } from 'sealos-desktop-sdk/service';
import { Coin, defaultSliderKey } from '@/constants/app';

export type QueryType = {
  name: string;
};

export interface YamlItemType {
  filename: string;
  value: string;
}

export type FormSliderListType = Record<
  string,
  {
    cpu: number[];
    memory: number[];
  }
>;

export type FileMangerType = {
  uploadLimit: number;
  downloadLimit: number;
};

export type AppConfigType = {
  cloud: {
    domain: string; // Main promoted domain
    port?: string;
    // List of domains available for users
    userDomains: {
      name: string;
      secretName: string;
    }[];
    desktopDomain: string; // Domain for the desktop application
  };
  common: {
    guideEnabled: boolean;
    apiEnabled: boolean;
    gpuEnabled: boolean;
  };
  launchpad: {
    infrastructure: {
      provider: string;
      requiresDomainReg: boolean;
      domainRegQueryLink: string;
      domainBindingDocumentationLink: string | null;
    };
    meta: {
      title: string;
      description: string;
      scripts: {
        src: string;
        [key: string]: string;
      }[];
    };
    currencySymbol: Coin;
    pvcStorageMax: number;
    eventAnalyze: {
      enabled: boolean;
      fastGPTKey?: string;
    };
    components: {
      monitor: {
        url: string;
      };
      billing: {
        url: string;
      };
      log: {
        url: string;
      };
    };
    appResourceFormSliderConfig: FormSliderListType;
    fileManger: FileMangerType;
    // todo: add gpu appResourceFormSliderConfig config.yaml and codes here
    // gpu?: {
    //   cpu: number[];
    //   memory: number[];
    // };
  };
};

declare global {
  var AppConfig: AppConfigType;
  var logger: WstLogger;
}

export type EnvResponse = {
  SEALOS_DOMAIN: string;
  DOMAIN_PORT: string;
  INFRASTRUCTURE_PROVIDER: string;
  REQUIRES_DOMAIN_REG: boolean;
  DOMAIN_REG_QUERY_LINK: string;
  DOMAIN_BINDING_DOCUMENTATION_LINK: string | null;
  SHOW_EVENT_ANALYZE: boolean;
  FORM_SLIDER_LIST_CONFIG: FormSliderListType;
  CURRENCY: Coin;
  guideEnabled: boolean;
  fileMangerConfig: FileMangerType;
  SEALOS_USER_DOMAINS: { name: string; secretName: string }[];
  DESKTOP_DOMAIN: string;
  PVC_STORAGE_MAX: number;
  GPU_ENABLED: boolean;
};
