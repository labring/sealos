import { z } from 'zod';

const UserDomainSchema = z.object({
  name: z.string(),
  secretName: z.string()
});

const CloudSchema = z.object({
  domain: z.string().default('cloud.sealos.io').describe('Main promoted domain'),
  port: z.string().optional().default('').describe('Optional port string, e.g. ":443"'),
  userDomains: z
    .array(UserDomainSchema)
    .default([{ name: 'cloud.sealos.io', secretName: 'wildcard-cert' }])
    .describe('List of domains available for users'),
  desktopDomain: z
    .string()
    .default('cloud.sealos.io')
    .describe('Domain for the desktop application')
});

const InfrastructureSchema = z.object({
  provider: z.string().default('alibaba'),
  requiresDomainReg: z.boolean().default(false),
  domainRegQueryLink: z.string().default('http://localhost:3000'),
  domainBindingDocumentationLink: z
    .string()
    .nullable()
    .default(null)
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
  title: z.string().default('Sealos Desktop App Demo'),
  description: z.string().default('Sealos Desktop App Demo'),
  scripts: z.array(MetaScriptSchema).default([])
});

const SliderConfigSchema = z.object({
  cpu: z.array(z.number()),
  memory: z.array(z.number())
});

const LaunchpadSchema = z.object({
  guideEnabled: z.boolean().default(false),
  apiEnabled: z.boolean().default(false),
  gpuEnabled: z
    .boolean()
    .default(false)
    .describe('Set at runtime by instrumentation hook based on GPU node detection'),
  infrastructure: InfrastructureSchema,
  domainChallengeSecret: z.string().optional().default('default-dev-secret-change-in-production'),
  meta: MetaSchema,
  gtmId: z.string().nullable().default(null).describe('Google Tag Manager ID, e.g. GTM-XXXXXX'),
  currencySymbol: z
    .enum(['shellCoin', 'cny', 'usd'])
    .default('shellCoin')
    .describe('Currency symbol type for pricing display'),
  pvcStorageMax: z.number().default(20).describe('Maximum PVC storage in GB'),
  eventAnalyze: z.object({
    enabled: z.boolean().default(false),
    fastGPTKey: z.string().optional().default('')
  }),
  components: z.object({
    monitor: z.object({
      url: z.string().default('http://launchpad-monitor.sealos.svc.cluster.local:8428')
    }),
    billing: z.object({
      url: z.string().default('http://account-service.account-system.svc:2333')
    }),
    log: z.object({ url: z.string().default('http://localhost:8080') })
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
    uploadLimit: z.number().default(5).describe('Upload limit in MB'),
    downloadLimit: z.number().default(100).describe('Download limit in MB')
  }),
  checkIcpReg: z
    .object({
      enabled: z.boolean().default(false),
      endpoint: z.string().default(''),
      accessKeyID: z.string().default(''),
      accessKeySecret: z.string().default('')
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
