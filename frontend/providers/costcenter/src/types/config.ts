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

declare global {
  var AppConfig: AppConfigType;
}
