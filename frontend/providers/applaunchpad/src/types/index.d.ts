import { WstLogger } from 'sealos-desktop-sdk/service';
import { defaultSliderKey } from '@/constants/app';

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
    domain: string;
    port?: string;
  };
  common: {
    guideEnabled: boolean;
    apiEnabled: boolean;
  };
  launchpad: {
    ingressTlsSecretName: string;
    eventAnalyze: {
      enabled: boolean;
      fastGPTKey?: string;
    };
    components: {
      monitor: {
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
  domain: string;
  guideEnabled: boolean;
};
