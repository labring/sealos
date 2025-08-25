export type SystemConfigType = {
  scripts: ScriptConfig[];
};

export type ScriptConfig = {
  src: string;
  'data-website-id'?: string;
};

export type LoginProps = {
  wechat_client_id: string;
  github_client_id: string;
  google_client_id: string;
  callback_url: string;
  service_protocol: string;
  private_protocol: string;
  needPassword: boolean;
  needSms: boolean;
  needGithub: boolean;
  needWechat: boolean;
  needGoogle: boolean;
};

export type SystemEnv = {
  SEALOS_CLOUD_DOMAIN: string;
  stripeEnabled: boolean;
  wechatEnabledRecharge: boolean;
  stripePub: string;
} & LoginProps;
