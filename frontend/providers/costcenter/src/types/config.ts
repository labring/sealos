export type AliSms = {
  endpoint: string;
  accessKeyID: string;
  accessKeySecret: string;
  templateCode: string;
  signName: string;
};

export type Mongo = {
  uri: string;
};

export type Invoice = {
  enabled: boolean;
  directDownload: boolean;
  feishApp: {
    appId: string;
    appSecret: string;
    feiShuBotURL: string;
    chatId: string;
    token: string;
    template: {
      id: string;
      version: string;
    };
  };
  serviceToken: string;
  aliSms: AliSms;
  mongo: Mongo;
  billingInfo: {
    companyName: string;
    addressLines: string[];
    contactLines: string[];
  };
};

export type PayMethods = {
  wechat: {
    enabled: boolean;
  };
  alipay: {
    enabled: boolean;
  };
  stripe: {
    enabled: boolean;
    publicKey: string;
  };
};

export type Recharge = {
  enabled: boolean;
  payMethods: PayMethods;
};

export type AccountService = {
  url: string;
};

export type DesktopService = {
  url: string;
};

export type Components = {
  accountService: AccountService;
  desktopService: DesktopService;
};

export type AppConfigType = {
  cloud: {
    regionUID: string;
    domain: string;
  };
  costCenter: {
    realNameRechargeLimit: boolean;
    transferEnabled: boolean;
    giftCodeEnabled: boolean;
    currencyType: string;
    layout: {
      meta: {
        noscripts: any[];
        scripts: any[];
      };
    };
    invoice: Invoice;
    recharge: Recharge;
    components: Components;
    gpuEnabled: boolean;
    auth: {
      jwt: {
        internal: string;
        billing: string;
      };
    };
  };
};

export var DefaultAppConfig: AppConfigType = {
  costCenter: {
    realNameRechargeLimit: false,
    giftCodeEnabled: true,
    transferEnabled: true,
    currencyType: 'shellCoin',
    invoice: {
      enabled: false,
      directDownload: true,
      feishApp: {
        appId: '',
        appSecret: '',
        feiShuBotURL: '',
        chatId: '',
        token: '',
        template: {
          id: '',
          version: ''
        }
      },
      serviceToken: '',
      aliSms: {
        endpoint: '',
        accessKeyID: '',
        accessKeySecret: '',
        templateCode: '',
        signName: ''
      },
      mongo: {
        uri: ''
      },
      billingInfo: {
        companyName: '',
        addressLines: [],
        contactLines: []
      }
    },
    recharge: {
      enabled: false,
      payMethods: {
        wechat: {
          enabled: false
        },
        alipay: {
          enabled: false
        },
        stripe: {
          enabled: false,
          publicKey: ''
        }
      }
    },
    components: {
      accountService: {
        url: 'http://account-service.account-system.svc:2333'
      },
      desktopService: {
        url: 'http://desktop-frontend.sealos.svc:3000'
      }
    },
    layout: {
      meta: {
        scripts: [],
        noscripts: []
      }
    },
    gpuEnabled: false,
    auth: {
      jwt: {
        internal: '',
        billing: ''
      }
    }
  },
  cloud: {
    regionUID: '',
    domain: ''
  }
};

declare global {
  var AppConfig: AppConfigType;
  var feishuClient: any;
}
