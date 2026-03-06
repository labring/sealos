import { z } from 'zod';

const AliSmsSchema = z.object({
  endpoint: z.string(),
  accessKeyID: z.string(),
  accessKeySecret: z.string(),
  templateCode: z.string(),
  signName: z.string(),
  invoiceCompletedTemplateCode: z.string()
});

const MongoSchema = z.object({
  uri: z.string()
});

const InvoiceSchema = z.object({
  enabled: z.boolean(),
  feishApp: z.object({
    appId: z.string(),
    appSecret: z.string(),
    feiShuBotURL: z.string(),
    chatId: z.string(),
    token: z.string(),
    template: z.object({
      id: z.string(),
      version: z.string()
    })
  }),
  serviceToken: z.string(),
  aliSms: AliSmsSchema,
  mongo: MongoSchema,
  billingInfo: z.object({
    companyName: z.string(),
    addressLines: z.array(z.string()),
    contactLines: z.array(z.string())
  })
});

const PayMethodsSchema = z.object({
  wechat: z.object({ enabled: z.boolean() }),
  alipay: z.object({ enabled: z.boolean() }),
  stripe: z.object({
    enabled: z.boolean(),
    publicKey: z.string()
  })
});

const RechargeSchema = z.object({
  enabled: z.boolean(),
  payMethods: PayMethodsSchema
});

const ComponentsSchema = z.object({
  accountService: z.object({ url: z.string() }),
  desktopService: z.object({ url: z.string() })
});

const MetaSchema = z.object({
  noscripts: z.array(z.record(z.string(), z.unknown())),
  scripts: z.array(z.record(z.string(), z.unknown()))
});

const LayoutSchema = z.object({
  meta: MetaSchema
});

const CostCenterSchema = z.object({
  realNameRechargeLimit: z.boolean(),
  transferEnabled: z.boolean(),
  giftCodeEnabled: z.boolean(),
  currencyType: z.enum(['shellCoin', 'cny', 'usd']),
  subscriptionEnabled: z.boolean(),
  layout: LayoutSchema,
  invoice: InvoiceSchema,
  recharge: RechargeSchema,
  components: ComponentsSchema,
  gpuEnabled: z.boolean(),
  auth: z.object({
    jwt: z.object({
      internal: z.string(),
      billing: z.string()
    })
  })
});

const CloudSchema = z.object({
  regionUID: z.string(),
  domain: z.string(),
  port: z.string().optional(),
  certSecretName: z.string().optional(),
  proxyDomain: z.string().optional()
});

export const AppConfigSchema = z.object({
  cloud: CloudSchema,
  costCenter: CostCenterSchema
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export const ClientAppConfigSchema = z.object({
  realNameRechargeLimit: z.boolean(),
  rechargeEnabled: z.boolean(),
  transferEnabled: z.boolean(),
  giftCodeEnabled: z.boolean(),
  currency: z.enum(['shellCoin', 'cny', 'usd']),
  subscriptionEnabled: z.boolean(),
  stripeEnabled: z.boolean(),
  stripePublicKey: z.string(),
  wechatEnabled: z.boolean(),
  alipayEnabled: z.boolean(),
  invoiceEnabled: z.boolean(),
  gpuEnabled: z.boolean(),
  billingInfo: z.object({
    companyName: z.string(),
    addressLines: z.array(z.string()),
    contactLines: z.array(z.string())
  }),
  accountServiceUrl: z.string(),
  desktopServiceUrl: z.string()
});

export type ClientAppConfig = z.infer<typeof ClientAppConfigSchema>;
