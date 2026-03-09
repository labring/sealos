import { z } from 'zod';

const AliSmsSchema = z
  .object({
    endpoint: z.string().describe('AliCloud SMS API endpoint'),
    accessKeyID: z.string().describe('AliCloud access key ID'),
    accessKeySecret: z.string().describe('AliCloud access key secret'),
    templateCode: z.string().describe('SMS template code'),
    signName: z.string().describe('SMS sign name'),
    invoiceCompletedTemplateCode: z.string().describe('Template code for invoice completion SMS')
  })
  .strict();

const MongoSchema = z
  .object({
    uri: z.string().describe('MongoDB connection URI')
  })
  .strict();

const InvoiceSchema = z
  .object({
    enabled: z.boolean().describe('Whether invoice feature is enabled'),
    feishuApp: z
      .object({
        appId: z.string().describe('Feishu app ID'),
        appSecret: z.string().describe('Feishu app secret'),
        feiShuBotURL: z.string().describe('Feishu bot webhook URL'),
        chatId: z.string().describe('Feishu chat ID'),
        token: z.string().describe('Feishu verification token'),
        template: z
          .object({
            id: z.string().describe('Message card template ID'),
            version: z.string().describe('Message card template version')
          })
          .strict()
      })
      .strict(),
    serviceToken: z.string().describe('Invoice service authentication token'),
    aliSms: AliSmsSchema,
    mongo: MongoSchema,
    billingInfo: z
      .object({
        companyName: z.string().describe('Billing company name'),
        addressLines: z.array(z.string()).describe('Billing address lines'),
        contactLines: z.array(z.string()).describe('Billing contact lines')
      })
      .strict()
  })
  .strict();

const PayMethodsSchema = z
  .object({
    wechat: z.object({ enabled: z.boolean().describe('Whether WeChat Pay is enabled') }).strict(),
    alipay: z.object({ enabled: z.boolean().describe('Whether Alipay is enabled') }).strict(),
    stripe: z
      .object({
        enabled: z.boolean().describe('Whether Stripe is enabled'),
        publicKey: z.string().describe('Stripe publishable key')
      })
      .strict()
  })
  .strict();

const RechargeSchema = z
  .object({
    enabled: z.boolean().describe('Whether recharge/top-up feature is enabled'),
    payMethods: PayMethodsSchema
  })
  .strict();

const ComponentsSchema = z
  .object({
    accountService: z.object({ url: z.string().describe('Account service base URL') }).strict(),
    desktopService: z.object({ url: z.string().describe('Desktop service base URL') }).strict()
  })
  .strict();

const MetaSchema = z
  .object({
    noscripts: z.array(z.record(z.string(), z.unknown())).describe('Noscript tag attributes'),
    scripts: z.array(z.record(z.string(), z.unknown())).describe('Script tag attributes')
  })
  .strict();

const FeaturesSchema = z
  .object({
    rechargeRequiresRealName: z
      .boolean()
      .describe('Whether users must complete real-name verification before recharging'),
    transfer: z.boolean().describe('Whether balance transfer between accounts is enabled'),
    giftCode: z.boolean().describe('Whether gift code redemption is enabled'),
    subscription: z.boolean().describe('Whether subscription/plan feature is enabled'),
    gpu: z.boolean().describe('Whether GPU resource display and pricing is enabled')
  })
  .strict();

const UiSchema = z
  .object({
    currencySymbolType: z
      .enum(['shellCoin', 'cny', 'usd'])
      .describe('Currency symbol type used for display'),
    meta: MetaSchema
  })
  .strict();

const CostCenterSchema = z
  .object({
    features: FeaturesSchema,
    ui: UiSchema,
    invoice: InvoiceSchema,
    recharge: RechargeSchema,
    components: ComponentsSchema,
    auth: z
      .object({
        jwt: z
          .object({
            internal: z.string().describe('Internal service JWT secret'),
            billing: z.string().describe('Billing service JWT secret')
          })
          .strict()
      })
      .strict()
  })
  .strict();

const CloudSchema = z
  .object({
    regionUid: z.string().describe('Unique identifier for this region'),
    domain: z.string().describe('Primary domain for this deployment'),
    port: z.number().optional().describe('Optional port number, e.g. 443'),
    certSecretName: z.string().optional().describe('Name of the TLS certificate Kubernetes secret'),
    proxyDomain: z.string().optional().describe('Optional proxy/CDN domain')
  })
  .strict();

export const AppConfigSchema = z
  .object({
    cloud: CloudSchema,
    costCenter: CostCenterSchema
  })
  .strict();

export type AppConfig = z.infer<typeof AppConfigSchema>;

export const ClientAppConfigSchema = z
  .object({
    features: z
      .object({
        rechargeRequiresRealName: z
          .boolean()
          .describe('Whether users must complete real-name verification before recharging'),
        transferEnabled: z.boolean().describe('Whether balance transfer is enabled'),
        giftCodeEnabled: z.boolean().describe('Whether gift code redemption is enabled'),
        subscriptionEnabled: z.boolean().describe('Whether subscription feature is enabled'),
        gpuEnabled: z.boolean().describe('Whether GPU resources are shown')
      })
      .strict(),
    currencySymbolType: z
      .enum(['shellCoin', 'cny', 'usd'])
      .describe('Currency symbol type used for display'),
    recharge: z
      .object({
        enabled: z.boolean().describe('Whether recharge is enabled'),
        payMethods: z
          .object({
            wechat: z.object({ enabled: z.boolean() }).strict(),
            alipay: z.object({ enabled: z.boolean() }).strict(),
            stripe: z.object({ enabled: z.boolean(), publicKey: z.string() }).strict()
          })
          .strict()
      })
      .strict(),
    invoice: z
      .object({
        enabled: z.boolean().describe('Whether invoice feature is enabled'),
        billingInfo: z
          .object({
            companyName: z.string(),
            addressLines: z.array(z.string()),
            contactLines: z.array(z.string())
          })
          .strict()
      })
      .strict(),
    components: z
      .object({
        accountService: z.object({ url: z.string() }).strict(),
        desktopService: z.object({ url: z.string() }).strict()
      })
      .strict()
  })
  .strict();

export type ClientAppConfig = z.infer<typeof ClientAppConfigSchema>;
