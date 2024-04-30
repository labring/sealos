import { WstLogger } from 'sealos-desktop-sdk/service';

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

export type AppConfigType = {
  cloud: {
    domain: string;
    port?: string;
  };
  common: {
    guideEnabled: string;
    apiEnabled: string;
  };
  launchpad: {
    ingressTlsSecretName: string;
    eventAnalyze: {
      enabled: string;
      fastGPTKey?: string;
    };
    components: {
      monitor: {
        url: string;
      };
    };
    appResourceFormSliderConfig: {
      default: {
        cpu: number[];
        memory: number[];
      };
      // todo: add gpu appResourceFormSliderConfig config.yaml and codes here
      // gpu?: {
      //   cpu: number[];
      //   memory: number[];
      // };
    };
  };
};

declare global {
  var AppConfig: AppConfigType;
  var logger: WstLogger;
}

export type EnvResponse = {
  domain: string;
  guideEnabled: boolean;
};
