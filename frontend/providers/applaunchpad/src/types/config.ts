import { z } from 'zod';

const UserDomainSchema = z.object({
  name: z.string(),
  secretName: z.string()
});

const CloudSchema = z.object({
  domain: z.string().describe('Main promoted domain'),
  port: z.string().optional().describe('Optional port string, e.g. ":443"'),
  userDomains: z.array(UserDomainSchema).describe('List of domains available for users'),
  desktopDomain: z.string().describe('Domain for the desktop application')
});

const InfrastructureSchema = z.object({
  provider: z.string(),
  requiresDomainReg: z.boolean(),
  domainRegQueryLink: z.string(),
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

const LaunchpadSchema = z.object({
  guideEnabled: z.boolean(),
  apiEnabled: z.boolean(),
  gpuEnabled: z
    .boolean()
    .describe('Set at runtime by instrumentation hook based on GPU node detection'),
  infrastructure: InfrastructureSchema,
  domainChallengeSecret: z.string().optional(),
  meta: MetaSchema,
  gtmId: z.string().nullable().describe('Google Tag Manager ID, e.g. GTM-XXXXXX'),
  currencySymbol: z
    .enum(['shellCoin', 'cny', 'usd'])
    .describe('Currency symbol type for pricing display'),
  pvcStorageMax: z.number().describe('Maximum PVC storage in GB'),
  eventAnalyze: z.object({
    enabled: z.boolean(),
    fastGPTKey: z.string().optional()
  }),
  components: z.object({
    monitor: z.object({
      url: z.string()
    }),
    billing: z.object({
      url: z.string()
    }),
    log: z.object({ url: z.string() })
  }),
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
    .describe('Slider configuration per GPU type key; "default" is the base config'),
  fileManger: z.object({
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

/**
 * Client-safe application configuration schema.
 * Excludes sensitive server-side secrets (e.g. checkIcpReg credentials).
 */
export const ClientAppConfigSchema = z.object({
  domain: z.string(),
  port: z.string().optional(),
  userDomains: z.array(UserDomainSchema),
  desktopDomain: z.string(),
  guideEnabled: z.boolean(),
  apiEnabled: z.boolean(),
  gpuEnabled: z.boolean(),
  infrastructure: z.object({
    provider: z.string(),
    requiresDomainReg: z.boolean(),
    domainRegQueryLink: z.string(),
    domainBindingDocumentationLink: z.string().nullable()
  }),
  currencySymbol: z.enum(['shellCoin', 'cny', 'usd']),
  pvcStorageMax: z.number(),
  eventAnalyze: z.object({
    enabled: z.boolean(),
    fastGPTKey: z.string().optional()
  }),
  components: z.object({
    monitor: z.object({ url: z.string() }),
    billing: z.object({ url: z.string() }),
    log: z.object({ url: z.string() })
  }),
  appResourceFormSliderConfig: z.record(z.string(), SliderConfigSchema),
  fileManger: z.object({
    uploadLimit: z.number(),
    downloadLimit: z.number()
  }),
  meta: z.object({
    title: z.string(),
    description: z.string()
  }),
  gtmId: z.string().nullable()
});

export type ClientAppConfig = z.infer<typeof ClientAppConfigSchema>;
