export type QueryType = {
  name: string;
  templateName: string;
};

export interface YamlItemType {
  filename: string;
  value: string;
}

export type ServiceEnvType = {
  SEALOS_DOMAIN: string;
  INGRESS_SECRET: string;
};
