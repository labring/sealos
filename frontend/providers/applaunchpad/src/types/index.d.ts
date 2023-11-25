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

declare global {
  var FormSliderListConfig: FormSliderListType;
  var logger: WstLogger;
}

export type EnvResponse = {
  domain: string;
};
