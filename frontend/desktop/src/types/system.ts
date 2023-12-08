export type SystemConfigType = {
  scripts: ScriptConfig[];
  isSystemConfigEnabled: boolean; // Compatible with older versions
  backgroundImageUrl: string;
  imageFallBackUrl: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  showGithubStar: boolean;
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
  service_protocol_zh: string;
  private_protocol_zh: string;
  service_protocol_en: string;
  private_protocol_en: string;
  needPassword: boolean;
  oauth_proxy: string;
  needSms: boolean;
  needGithub: boolean;
  needWechat: boolean;
  needGoogle: boolean;
};

export type SystemEnv = {
  SEALOS_CLOUD_DOMAIN: string;
  wechatEnabledRecharge: boolean;
  rechargeEnabled: boolean;
  licenseEnabled: boolean;
  guideEnabled: boolean;
  openWechatEnabled: boolean;
} & LoginProps;
