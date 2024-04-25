export type CloudConfigType = {
  domain: string;
  port: string;
  regionUID: string;
  certSecretName: string;
};

export type CommonConfigType = {
  guideEnabled: boolean;
  apiEnabled: boolean;
  rechargeEnabled: boolean;
};

export type DatabaseConfigType = {
  mongodbURI: string;
  globalCockroachdbURI: string;
  regionalCockroachdbURI: string;
};

export type MetaConfigType = {
  title: string;
  description: string;
  keywords: string;
  scripts: MetaScriptType[];
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
  cfSiteKey?: string;
  protocol: ProtocolConfigType;
  meta: MetaConfigType;
  common: {
    githubStarEnabled: boolean;
  };
};

export type AuthConfigType = {
  proxyAddress?: string;
  callbackURL: string;
  jwt: JwtConfigType;
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
        signName: string;
        accessKeyID: string;
        accessKeySecret?: string;
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

export type JwtConfigType = {
  internal?: string;
  regional?: string;
  global?: string;
};

export type DesktopConfigType = {
  layout: LayoutConfigType;
  auth: AuthConfigType;
  components: {
    billingService: {
      uri: string;
    };
  };
};

export type AppConfigType = {
  cloud: CloudConfigType;
  common: CommonConfigType;
  database: DatabaseConfigType;
  desktop: DesktopConfigType;
};

export const DefaultCommonConfig: CommonConfigType = {
  guideEnabled: false,
  apiEnabled: false,
  rechargeEnabled: false
};

export const DefaultCloudConfig: CloudConfigType = {
  domain: 'cloud.sealos.io',
  port: '443',
  regionUID: 'sealos-cloud',
  certSecretName: 'wildcard-cert'
};

export const DefaultLayoutConfig: LayoutConfigType = {
  title: 'Sealos Cloud',
  logo: 'logo.svg',
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
    githubStarEnabled: false
  }
};

export const DefaultAuthConfig: AuthConfigType = {
  callbackURL: 'https://cloud.sealos.io/callback',
  jwt: {
    internal: 'internal',
    regional: 'regional',
    global: 'global'
  },
  idp: {
    password: {
      enabled: true
    }
  }
};
