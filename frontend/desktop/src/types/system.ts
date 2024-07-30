import { DeepRequired, OmitPath, OmitPathArr } from './tools';

export type CloudConfigType = {
  domain: string;
  port: string;
  regionUID: string;
  certSecretName: string;
};

export type CommonConfigType = {
  realNameAuthEnabled: boolean;
  guideEnabled: boolean;
  apiEnabled: boolean;
  rechargeEnabled: boolean;
  cfSiteKey?: string;
  templateUrl?: string;
  objectstorageUrl: string;
  applaunchpadUrl: string;
  dbproviderUrl: string;
};
export type CommonClientConfigType = DeepRequired<
  Omit<
    CommonConfigType,
    'apiEnabled' | 'objectstorageUrl' | 'applaunchpadUrl' | 'dbproviderUrl' | 'templateUrl'
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
  title: string;
  logo: string;
  backgroundImage: string;
  meta: MetaConfigType;

  protocol?: ProtocolConfigType;
  common: {
    githubStarEnabled: boolean;
    workorderEnabled: boolean;
    accountSettingEnabled: boolean;
    docsUrl?: string;
    aiAssistantEnabled: boolean;
  };
};

export type AuthConfigType = {
  proxyAddress?: string;
  callbackURL: string;
  signUpEnabled?: boolean;
  baiduToken?: string;
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
      clientID: string;
      clientSecret?: string;
    };
    wechat?: {
      enabled: boolean;
      clientID: string;
      clientSecret?: string;
    };
    google?: {
      enabled: boolean;
      clientID: string;
      clientSecret?: string;
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
      email?: {
        enabled: boolean;
        host: string;
        port: number;
        user: string;
        password: string;
      };
    };
    oauth2?: {
      enabled: boolean;
      callbackURL: string;
      clientID: string;
      clientSecret?: string;
      authURL: string;
      tokenURL: string;
      userInfoURL: string;
    };
  };
};

export type AuthClientConfigType = DeepRequired<
  OmitPathArr<
    AuthConfigType,
    [
      'signUpEnabled',
      'invite.lafSecretKey',
      'invite.lafBaseURL',
      'idp.password.salt',
      'idp.github.clientSecret',
      'idp.wechat.clientSecret',
      'idp.google.clientSecret',
      'idp.sms.ali',
      'idp.sms.email',
      'idp.oauth2.clientSecret',
      'jwt',
      'billingUrl',
      'workorderUrl',
      'cloudVitrualMachineUrl'
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

export type AppConfigType = {
  cloud: CloudConfigType;
  common: CommonConfigType;
  database: DatabaseConfigType;
  desktop: DesktopConfigType;
};
export type AppClientConfigType = {
  cloud: CloudConfigType;
  common: CommonClientConfigType;
  desktop: DesktopConfigType<AuthClientConfigType>;
};

export const DefaultCommonClientConfig: CommonClientConfigType = {
  realNameAuthEnabled: false,
  guideEnabled: false,
  rechargeEnabled: false,
  cfSiteKey: ''
};

export const DefaultCloudConfig: CloudConfigType = {
  domain: 'cloud.sealos.io',
  port: '443',
  regionUID: 'sealos-cloud',
  certSecretName: 'wildcard-cert'
};

export const DefaultLayoutConfig: LayoutConfigType = {
  title: 'Sealos Cloud',
  logo: '/logo.svg',
  backgroundImage: '/images/bg-blue.svg',
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
    aiAssistantEnabled: false
  }
};

export const DefaultAuthClientConfig: AuthClientConfigType = {
  baiduToken: '',
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
      clientID: ''
    },
    wechat: {
      enabled: false,
      clientID: ''
    },
    google: {
      enabled: false,
      clientID: ''
    },
    sms: {
      enabled: false
    },
    oauth2: {
      enabled: false,
      callbackURL: '',
      clientID: '',
      authURL: '',
      tokenURL: '',
      userInfoURL: ''
    }
  },
  proxyAddress: ''
};

export const DefaultAppClientConfig: AppClientConfigType = {
  cloud: DefaultCloudConfig,
  common: DefaultCommonClientConfig,
  desktop: {
    layout: DefaultLayoutConfig,
    auth: DefaultAuthClientConfig
  }
};
