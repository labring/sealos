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
    ephemeralStorage?: number[];
  }
>;

export type FileMangerType = {
  uploadLimit: number;
  downloadLimit: number;
};

export type CustomDomainMode = 'cname' | 'certificate';

export type AppConfigType = {
  cloud: {
    domain: string; // Main promoted domain
    port?: string;
    httpPort?: string;
    disableHttps?: boolean;
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
    networkStorageEnabled: boolean;
  };
  launchpad: {
    infrastructure: {
      provider: string;
      requiresDomainReg: boolean;
      domainRegQueryLink: string;
      domainBindingDocumentationLink: string | null;
    };
    domainChallengeSecret?: string;
    meta: {
      title: string;
      description: string;
      scripts: {
        src: string;
        [key: string]: string;
      }[];
    };
    gtmId: string | null;
    currencySymbol: Coin;
    pvcStorageMax: number;
    imagePorts?: {
      enabled?: boolean;
      trustedRegistries?: string[];
    };
    publicDomain?: {
      customPrefixEnabled?: boolean;
      reservedPrefixes?: string[];
    };
    customDomain?: {
      mode?: CustomDomainMode;
      certificate?: {
        tlsSecretName?: string;
      };
    };
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
  HTTP_PORT: string;
  DISABLE_HTTPS: boolean;
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
  LOG_ENABLED: boolean;
  NETWORK_STORAGE_ENABLED: boolean;
  IMAGE_PORTS_ENABLED: boolean;
  CUSTOM_PUBLIC_DOMAIN_PREFIX_ENABLED: boolean;
  PUBLIC_DOMAIN_RESERVED_PREFIXES: string[];
  CUSTOM_DOMAIN_MODE: CustomDomainMode;
  CUSTOM_DOMAIN_CERTIFICATE_SECRET_NAME: string;
};
