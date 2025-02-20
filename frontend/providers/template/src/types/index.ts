import Cron from 'croner';

declare global {
  var updateRepoCronJob: Cron;
}

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

export type EnvResponse = {
  FORCED_LANGUAGE: string;
  SEALOS_CLOUD_DOMAIN: string;
  SEALOS_CERT_SECRET_NAME: string;
  TEMPLATE_REPO_URL: string;
  TEMPLATE_REPO_BRANCH: string;
  SEALOS_NAMESPACE: string;
  SEALOS_SERVICE_ACCOUNT: string;
  SHOW_AUTHOR: string;
  DESKTOP_DOMAIN: string;
  CURRENCY_SYMBOL: 'shellCoin' | 'cny' | 'usd';
};
