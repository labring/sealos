import { z } from 'zod';

const AliSmsSchema = z.strictObject({
  endpoint: z.string().describe('AliCloud SMS API endpoint'),
  accessKeyID: z.string().describe('AliCloud access key ID'),
  accessKeySecret: z.string().describe('AliCloud access key secret'),
  templateCode: z.string().describe('SMS template code'),
  signName: z.string().describe('SMS sign name'),
  invoiceCompletedTemplateCode: z.string().describe('Template code for invoice completion SMS')
});

const MongoSchema = z.strictObject({
  uri: z.string().describe('MongoDB connection URI')
});

const InvoiceSchema = z.strictObject({
  enabled: z.boolean().describe('Whether invoice feature is enabled'),
  feishuApp: z.strictObject({
    appId: z.string().describe('Feishu app ID'),
    appSecret: z.string().describe('Feishu app secret'),
    feiShuBotURL: z.string().describe('Feishu bot webhook URL'),
    chatId: z.string().describe('Feishu chat ID'),
    token: z.string().describe('Feishu verification token'),
    template: z.strictObject({
      id: z.string().describe('Message card template ID'),
      version: z.string().describe('Message card template version')
    })
  }),
  serviceToken: z.string().describe('Invoice service authentication token'),
  aliSms: AliSmsSchema,
  mongo: MongoSchema,
  billingInfo: z.strictObject({
    companyName: z.string().describe('Billing company name'),
    addressLines: z.array(z.string()).describe('Billing address lines'),
    contactLines: z.array(z.string()).describe('Billing contact lines')
  })
});

const PayMethodsSchema = z.strictObject({
  wechat: z.strictObject({ enabled: z.boolean().describe('Whether WeChat Pay is enabled') }),
  alipay: z.strictObject({ enabled: z.boolean().describe('Whether Alipay is enabled') }),
  stripe: z.strictObject({
    enabled: z.boolean().describe('Whether Stripe is enabled'),
    publicKey: z.string().describe('Stripe publishable key')
  })
});

const RechargeSchema = z.strictObject({
  enabled: z.boolean().describe('Whether recharge/top-up feature is enabled'),
  payMethods: PayMethodsSchema
});

const ComponentsSchema = z.strictObject({
  billing: z.strictObject({
    url: z.string().describe('Billing service base URL'),
    secret: z.string().describe('Billing service JWT secret')
  }),
  desktop: z.strictObject({
    url: z.string().describe('Desktop service base URL')
  })
});

const MetaSchema = z.strictObject({
  noscripts: z.array(z.record(z.string(), z.unknown())).describe('Noscript tag attributes'),
  scripts: z.array(z.record(z.string(), z.unknown())).describe('Script tag attributes')
});

const FeaturesSchema = z.strictObject({
  rechargeRequiresRealName: z
    .boolean()
    .describe('Whether users must complete real-name verification before recharging'),
  transfer: z.boolean().describe('Whether balance transfer between accounts is enabled'),
  giftCode: z.boolean().describe('Whether gift code redemption is enabled'),
  subscription: z.boolean().describe('Whether subscription/plan feature is enabled'),
  gpu: z.boolean().describe('Whether GPU resource display and pricing is enabled')
});

const UiSchema = z.strictObject({
  currencySymbol: z
    .enum(['shellCoin', 'cny', 'usd'])
    .describe('Currency symbol type used for display'),
  meta: MetaSchema
});

const CostCenterSchema = z.strictObject({
  features: FeaturesSchema,
  ui: UiSchema,
  invoice: InvoiceSchema,
  recharge: RechargeSchema,
  components: ComponentsSchema,
  auth: z.strictObject({
    jwt: z.strictObject({
      internal: z.string().describe('Internal service JWT secret')
    })
  })
});

const CloudSchema = z.strictObject({
  regionUid: z.string().describe('Unique identifier for this region'),
  domain: z.string().describe('Primary domain for this deployment'),
  port: z.number().describe('Port number, e.g. 443'),
  certSecretName: z.string().describe('Name of the TLS certificate Kubernetes secret')
});

export const AppConfigSchema = z.strictObject({
  cloud: CloudSchema,
  costCenter: CostCenterSchema
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export const ClientAppConfigSchema = z.strictObject({
  features: z.strictObject({
    rechargeRequiresRealName: z
      .boolean()
      .describe('Whether users must complete real-name verification before recharging'),
    transferEnabled: z.boolean().describe('Whether balance transfer is enabled'),
    giftCodeEnabled: z.boolean().describe('Whether gift code redemption is enabled'),
    subscriptionEnabled: z.boolean().describe('Whether subscription feature is enabled'),
    gpuEnabled: z.boolean().describe('Whether GPU resources are shown')
  }),
  currencySymbol: z
    .enum(['shellCoin', 'cny', 'usd'])
    .describe('Currency symbol type used for display'),
  recharge: z.strictObject({
    enabled: z.boolean().describe('Whether recharge is enabled'),
    payMethods: z.strictObject({
      wechat: z.strictObject({ enabled: z.boolean() }),
      alipay: z.strictObject({ enabled: z.boolean() }),
      stripe: z.strictObject({ enabled: z.boolean(), publicKey: z.string() })
    })
  }),
  invoice: z.strictObject({
    enabled: z.boolean().describe('Whether invoice feature is enabled'),
    billingInfo: z.strictObject({
      companyName: z.string(),
      addressLines: z.array(z.string()),
      contactLines: z.array(z.string())
    })
  }),
  components: z.strictObject({
    billing: z.strictObject({ url: z.string() }),
    desktop: z.strictObject({ url: z.string() })
  })
});

export type ClientAppConfig = z.infer<typeof ClientAppConfigSchema>;
