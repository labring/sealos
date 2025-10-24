import { DeepRequired, OmitPathArr } from './tools';

export type CloudConfigType = {
  domain: string;
  port: string;
  regionUID: string;
  certSecretName: string;
  proxyDomain: string;
  allowedOrigins: string[];
};

export type CommonConfigType = {
  enterpriseRealNameAuthEnabled: boolean;
  realNameAuthEnabled: boolean;
  realNameReward: number;
  realNameCallbackUrl?: string;
  guideEnabled: boolean;
  apiEnabled: boolean;
  rechargeEnabled: boolean;
  cfSiteKey?: string;
  templateUrl?: string;
  objectstorageUrl: string;
  applaunchpadUrl: string;
  dbproviderUrl: string;
  trackingEnabled: boolean;
};
export type CommonClientConfigType = DeepRequired<
  Omit<
    CommonConfigType,
    | 'apiEnabled'
    | 'objectstorageUrl'
    | 'applaunchpadUrl'
    | 'dbproviderUrl'
    | 'templateUrl'
    | 'realNameCallbackUrl'
  >
>;
export type DatabaseConfigType = {
  mongodbURI: string;
  globalCockroachdbURI: string;
  regionalCockroachdbURI: string;
};

export type MetaConfigType = {
  title: string;
  description: string;
  keywords: string;
  scripts?: MetaScriptType[];
  noscripts?: any[];
};

export type MetaScriptType = {
  src: string;
  'data-website-id'?: string;
};

export type ProtocolConfigType = {
  serviceProtocol: {
    zh: string;
    en: string;
  };
  privateProtocol: {
    zh: string;
    en: string;
  };
};

export type LayoutConfigType = {
  version: 'cn' | 'en';
  title: string;
  logo: string;
  backgroundImage: string;
  meta: MetaConfigType;
  customerServiceURL?: string;
  discordInviteLink?: string;
  forcedLanguage?: string;
  currencySymbol?: 'shellCoin' | 'cny' | 'usd';
  protocol?: ProtocolConfigType;
  common: {
    githubStarEnabled: boolean;
    workorderEnabled: boolean;
    accountSettingEnabled: boolean;
    docsUrl?: string;
    aiAssistantEnabled: boolean;
    bannerEnabled: boolean;
    subscriptionEnabled: boolean;
  };
  gtmId: string | null;
};

export type AuthConfigType = {
  billingToken?: string;
  callbackURL: string;
  signUpEnabled?: boolean;
  baiduToken?: string;
  bingAd?: {
    tenant: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    developerToken: string;
    customerId: number;
    customerAccountId: number;
    conversionName: string;
  };
  hasBaiduToken?: boolean;
  jwt: JwtConfigType;
  billingUrl?: string;
  workorderUrl?: string;
  cloudVitrualMachineUrl: string;
  invite?: {
    enabled: boolean;
    lafSecretKey: string;
    lafBaseURL: string;
  };
  idp: {
    password?: {
      enabled: boolean;
      salt?: string;
    };
    github?: {
      enabled: boolean;
      proxyAddress?: string;
      clientID: string;
      clientSecret?: string;
    };
    wechat?: {
      enabled: boolean;
      proxyAddress?: string;
      clientID: string;
      clientSecret?: string;
    };
    google?: {
      enabled: boolean;
      proxyAddress?: string;
      clientID: string;
      clientSecret?: string;
    };
    oauth2?: {
      enabled: boolean;
      callbackURL: string;
      clientID: string;
      proxyAddress?: string;
      clientSecret?: string;
      authURL: string;
      tokenURL: string;
      userInfoURL: string;
    };
    sms?: {
      enabled: boolean;
      ali?: {
        enabled: boolean;
        endpoint: string;
        templateCode: string;
        signName: string;
        accessKeyID: string;
        accessKeySecret?: string;
      };
    };
    email?: {
      enabled: boolean;
      host: string;
      port: number;
      user: string;
      password: string;
      language?: string;
    };
  };
  captcha?: {
    ali?: {
      enabled: boolean;
      sceneId: string;
      prefix: string;
      endpoint: string;
      accessKeyID: string;
      accessKeySecret?: string;
    };
    turnstile?: {
      enabled: boolean;
      siteKey: string;
      secretKey: string;
    };
  };
};

export type AuthClientConfigType = {
  idp: {
    sms: {
      enabled: boolean;
      ali: {
        enabled: boolean;
      };
    };
    email: {
      enabled: boolean;
    };
  };
} & DeepRequired<
  OmitPathArr<
    AuthConfigType,
    [
      'baiduToken',
      'bingAd',
      'signUpEnabled',
      'invite.lafSecretKey',
      'invite.lafBaseURL',
      'idp.password.salt',
      'idp.github.clientSecret',
      'idp.wechat.clientSecret',
      'idp.google.clientSecret',
      'idp.sms',
      'idp.email',
      'idp.oauth2.clientSecret',
      'jwt',
      'billingUrl',
      'workorderUrl',
      'cloudVitrualMachineUrl',
      //captcha
      'captcha.ali.accessKeyID',
      'captcha.ali.accessKeySecret',
      'captcha.ali.endpoint',
      // turnstile
      'captcha.turnstile.secretKey'
    ]
  >
>;

export type JwtConfigType = {
  internal?: string;
  regional?: string;
  global?: string;
};

export type DesktopConfigType<T = AuthConfigType> = {
  layout: LayoutConfigType;
  auth: T;
  teamManagement?: {
    maxTeamCount: number;
    maxTeamMemberCount: number;
  };
};

export type TrackingConfigType = {
  websiteId?: string;
  hostUrl?: string;
};

export type RealNameOSSConfigType = {
  accessKey: string;
  accessKeySecret: string;
  endpoint: string;
  ssl?: boolean;
  port?: number;
  realNameBucket: string;
  enterpriseRealNameBucket: string;
};

export type AppConfigType = {
  cloud: CloudConfigType;
  common: CommonConfigType;
  database: DatabaseConfigType;
  desktop: DesktopConfigType;
  tracking: TrackingConfigType;
  realNameOSS: RealNameOSSConfigType;
};

export type AppClientConfigType = {
  cloud: CloudConfigType;
  common: CommonClientConfigType;
  tracking: Required<TrackingConfigType>;
  desktop: DesktopConfigType<AuthClientConfigType>;
};

export const DefaultCommonClientConfig: CommonClientConfigType = {
  enterpriseRealNameAuthEnabled: false,
  trackingEnabled: false,
  realNameAuthEnabled: false,
  realNameReward: 0,
  guideEnabled: false,
  rechargeEnabled: false,
  cfSiteKey: ''
};

export const DefaultCloudConfig: CloudConfigType = {
  domain: 'cloud.sealos.io',
  port: '443',
  regionUID: 'sealos-cloud',
  certSecretName: 'wildcard-cert',
  proxyDomain: 'cloud.sealos.io',
  allowedOrigins: ['cloud.sealos.io']
};

export const DefaultLayoutConfig: LayoutConfigType = {
  version: 'cn',
  title: 'Sealos Cloud',
  logo: '/logo.svg',
  backgroundImage: '/images/bg-light.svg',
  protocol: {
    serviceProtocol: {
      zh: '',
      en: ''
    },
    privateProtocol: {
      zh: '',
      en: ''
    }
  },
  meta: {
    title: 'Sealos Cloud',
    description: 'Sealos Cloud',
    keywords: 'Sealos Cloud',
    scripts: []
  },
  common: {
    githubStarEnabled: false,
    workorderEnabled: false,
    accountSettingEnabled: false,
    aiAssistantEnabled: false,
    bannerEnabled: false,
    subscriptionEnabled: false
  },
  gtmId: null
};

export const DefaultAuthClientConfig: AuthClientConfigType = {
  hasBaiduToken: false,
  invite: {
    enabled: false
  },
  callbackURL: 'https://cloud.sealos.io/callback',
  idp: {
    password: {
      enabled: true
    },
    github: {
      enabled: false,
      clientID: '',
      proxyAddress: ''
    },
    wechat: {
      enabled: false,
      clientID: '',
      proxyAddress: ''
    },
    google: {
      enabled: false,
      clientID: '',
      proxyAddress: ''
    },
    sms: {
      enabled: false,
      ali: {
        enabled: false
      }
    },
    email: {
      enabled: false
    },
    oauth2: {
      enabled: false,
      callbackURL: '',
      clientID: '',
      authURL: '',
      tokenURL: '',
      userInfoURL: '',
      proxyAddress: ''
    }
  },
  billingToken: '',
  captcha: {
    ali: {
      enabled: false,
      sceneId: '',
      prefix: ''
    },
    turnstile: {
      enabled: false,
      siteKey: ''
    }
  }
};
export const DefaultAppClientConfig: AppClientConfigType = {
  cloud: DefaultCloudConfig,
  common: DefaultCommonClientConfig,
  tracking: {
    websiteId: '',
    hostUrl: ''
  },
  desktop: {
    layout: DefaultLayoutConfig,
    auth: DefaultAuthClientConfig
  }
};
