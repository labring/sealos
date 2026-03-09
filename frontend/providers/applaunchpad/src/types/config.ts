import { z } from 'zod';

const UserDomainSchema = z.object({
  name: z.string(),
  secretName: z.string()
});

const CloudSchema = z.object({
  domain: z.string().describe('Main promoted domain'),
  port: z.number().optional().describe('Optional port number, e.g. 443'),
  userDomains: z.array(UserDomainSchema).describe('List of domains available for users'),
  desktopDomain: z.string().describe('Domain for the desktop application')
});

const InfrastructureSchema = z.object({
  provider: z.string(),
  requiresIcpReg: z.boolean(),
  icpRegQueryLink: z.string(),
  domainBindingDocumentationLink: z
    .string()
    .nullable()
    .describe('Link to domain binding documentation, or null if not applicable')
});

/**
 * Script schema for <Script> component injection.
 * Supports any string attributes (src, strategy, data-*, etc.).
 */
const MetaScriptSchema = z
  .object({
    src: z.string()
  })
  .catchall(z.string());

const MetaSchema = z.object({
  title: z.string(),
  description: z.string(),
  scripts: z.array(MetaScriptSchema)
});

const SliderConfigSchema = z.object({
  cpu: z.array(z.number()),
  memory: z.array(z.number())
});

const FeaturesSchema = z
  .object({
    guide: z.boolean().describe('Whether the interactive guide feature is enabled'),
    api: z.boolean().describe('Whether the public API feature is enabled'),
    gpu: z
      .boolean()
      .describe(
        'Whether GPU resource support is enabled; overridden at runtime by GPU node detection'
      )
  })
  .strict();

const UiSchema = z
  .object({
    currencySymbol: z
      .enum(['shellCoin', 'cny', 'usd'])
      .describe('Currency symbol type for pricing display'),
    meta: MetaSchema.describe('Page meta tags and custom script injection'),
    appResourceFormSliderConfig: z
      .record(z.string(), SliderConfigSchema)
      .default({
        default: {
          cpu: [100, 200, 500, 1000, 2000, 3000, 4000, 8000],
          memory: [64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384]
        },
        'default-gpu': {
          cpu: [8000, 16000, 32000, 48000, 64000, 80000, 108000],
          memory: [16384, 32768, 65536, 131072, 262144, 524288, 614400]
        }
      })
      .describe('Slider configuration per GPU type key; "default" is the base config')
  })
  .strict();

const LaunchpadSchema = z.object({
  features: FeaturesSchema.describe('Feature flags and behavior switches'),
  ui: UiSchema.describe('UI and branding configuration'),
  infrastructure: InfrastructureSchema,
  domainChallengeSecret: z.string().optional(),
  pvcStorageMax: z.number().describe('Maximum PVC storage in GB'),
  analytics: z.object({
    enabled: z.boolean(),
    fastGPTKey: z.string().optional(),
    gtmId: z.string().nullable().describe('Google Tag Manager ID, e.g. GTM-XXXXXX')
  }),
  components: z.object({
    monitoring: z.object({
      url: z.string()
    }),
    billing: z.object({
      url: z.string()
    }),
    logging: z.object({
      url: z.string(),
      enabled: z.boolean().describe('Whether the logging service is enabled')
    })
  }),
  fileManager: z.object({
    uploadLimit: z.number().describe('Upload limit in MB'),
    downloadLimit: z.number().describe('Download limit in MB')
  }),
  checkIcpReg: z
    .object({
      enabled: z.boolean(),
      endpoint: z.string(),
      accessKeyID: z.string(),
      accessKeySecret: z.string()
    })
    .describe('ICP registration check configuration (server-side only)')
});

/**
 * Complete application configuration schema.
 * Validated and loaded at startup via the instrumentation hook.
 */
export const AppConfigSchema = z.object({
  cloud: CloudSchema,
  launchpad: LaunchpadSchema
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export type SliderConfig = z.infer<typeof SliderConfigSchema>;
export type FormSliderListType = Record<string, SliderConfig>;

/**
 * Client-safe application configuration schema.
 * Excludes sensitive server-side secrets (e.g. checkIcpReg credentials).
 */
export const ClientAppConfigSchema = z.object({
  domain: z.string(),
  port: z.number().optional(),
  userDomains: z.array(UserDomainSchema),
  desktopDomain: z.string(),
  guideEnabled: z.boolean(),
  apiEnabled: z.boolean(),
  gpuEnabled: z.boolean(),
  infrastructure: z.object({
    provider: z.string(),
    requiresIcpReg: z.boolean(),
    icpRegQueryLink: z.string(),
    domainBindingDocumentationLink: z.string().nullable()
  }),
  currencySymbol: z.enum(['shellCoin', 'cny', 'usd']),
  pvcStorageMax: z.number(),
  analytics: z.object({
    enabled: z.boolean(),
    fastGPTKey: z.string().optional(),
    gtmId: z.string().nullable()
  }),
  components: z.object({
    monitoring: z.object({ url: z.string() }),
    billing: z.object({ url: z.string() }),
    logging: z.object({ url: z.string(), enabled: z.boolean() })
  }),
  appResourceFormSliderConfig: z.record(z.string(), SliderConfigSchema),
  fileManager: z.object({
    uploadLimit: z.number(),
    downloadLimit: z.number()
  }),
  meta: z.object({
    title: z.string(),
    description: z.string()
  })
});

export type ClientAppConfig = z.infer<typeof ClientAppConfigSchema>;
