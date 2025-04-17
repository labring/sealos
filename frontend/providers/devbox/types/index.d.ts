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
