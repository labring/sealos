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
  feiShuBotURL: string;
  aliSms: AliSms;
  mongo: Mongo;
};

export type PayMethods = {
  wechat: {
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

export type Components = {
  accountService: AccountService;
};

export type AppConfigType = {
  costCenter: {
    transferEnabled: boolean;
    currencyType: string;
    invoice: Invoice;
    recharge: Recharge;
    components: Components;
    gpuEnabled: boolean;
  };
};

export var DefaultAppConfig: AppConfigType = {
  costCenter: {
    transferEnabled: true,
    currencyType: 'shellCoin',
    invoice: {
      enabled: false,
      feiShuBotURL: '',
      aliSms: {
        endpoint: '',
        accessKeyID: '',
        accessKeySecret: '',
        templateCode: '',
        signName: ''
      },
      mongo: {
        uri: ''
      }
    },
    recharge: {
      enabled: false,
      payMethods: {
        wechat: {
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
      }
    },
    gpuEnabled: false
  }
};

declare global {
  var AppConfig: AppConfigType;
}
