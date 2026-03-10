import { z } from 'zod/v4';

const UserDomainSchema = z
  .object({
    domain: z.string().describe('Ingress domain suffix for generated public domains'),
    secretName: z.string().describe('TLS secret name for wildcard ingress')
  })
  .strict();

const CustomScriptSchema = z.union([
  z
    .object({
      id: z.string().describe('Unique script element ID'),
      src: z.string().describe('External script URL'),
      strategy: z
        .enum(['afterInteractive', 'lazyOnload', 'beforeInteractive', 'worker'])
        .describe('Next.js Script loading strategy')
    })
    .strict(),
  z
    .object({
      id: z.string().describe('Unique script element ID'),
      content: z.string().describe('Inline script content'),
      strategy: z
        .enum(['afterInteractive', 'lazyOnload', 'beforeInteractive', 'worker'])
        .describe('Next.js Script loading strategy')
    })
    .strict()
]);

const CloudSchema = z
  .object({
    domain: z.string().describe('Primary cloud domain'),
    port: z.number().int().positive().describe('Cloud HTTPS port'),
    regionUid: z.string().describe('Cloud region UID')
  })
  .strict();

const DevboxUiSchema = z
  .object({
    docUrls: z
      .object({
        docs: z
          .object({
            zh: z.string().describe('Documentation URL for Chinese users'),
            en: z.string().describe('Documentation URL for English users')
          })
          .strict()
          .describe('Public documentation links'),
        privacy: z
          .object({
            zh: z.string().describe('Privacy policy URL for Chinese users'),
            en: z.string().describe('Privacy policy URL for English users')
          })
          .strict()
          .describe('Privacy policy links')
      })
      .strict()
      .describe('Documentation and privacy links'),
    currencySymbolType: z
      .enum(['shellCoin', 'cny', 'usd'])
      .describe('Currency symbol type shown in UI'),
    customScripts: z.array(CustomScriptSchema).describe('Custom scripts injected in root layout')
  })
  .strict();

const DevboxFeaturesSchema = z
  .object({
    guide: z.boolean().describe('Whether in-app guide flow is enabled'),
    importTemplate: z.boolean().describe('Whether template import is enabled'),
    webide: z.boolean().describe('Whether WebIDE feature is enabled'),
    advancedSettings: z.boolean().describe('Whether advanced settings are enabled'),
    affinityScheduling: z.boolean().describe('Whether affinity scheduling is enabled')
  })
  .strict();

const DevboxRuntimeSchema = z
  .object({
    rootNamespace: z.string().describe('Root runtime namespace'),
    defaultNamespace: z.string().describe('Default user namespace'),
    sshDomain: z.string().describe('SSH endpoint domain'),
    registryHost: z.string().describe('Container registry host'),
    webidePort: z.number().int().positive().describe('WebIDE service port')
  })
  .strict();

const DevboxResourcesSchema = z
  .object({
    storageLimit: z.string().describe('Default PVC storage limit'),
    cpuMarks: z.array(z.number().int().positive()).describe('CPU slider marks'),
    memoryMarks: z.array(z.number().int().positive()).describe('Memory slider marks'),
    storageClassNfs: z.string().describe('NFS storage class name')
  })
  .strict();

const DevboxComponentsSchema = z
  .object({
    appLaunchpad: z
      .object({
        url: z.string().describe('AppLaunchpad backend URL for create-app requests')
      })
      .strict(),
    monitoring: z
      .object({
        url: z.string().describe('Monitoring backend URL')
      })
      .strict(),
    retagService: z
      .object({
        url: z.string().describe('Retag service base URL')
      })
      .strict(),
    account: z
      .object({
        url: z.string().describe('Account backend base URL')
      })
      .strict(),
    gpu: z
      .object({
        enabled: z.boolean().describe('Whether GPU pricing should be enabled')
      })
      .strict()
  })
  .strict();

const DevboxSecuritySchema = z
  .object({
    domainChallengeSecret: z
      .string()
      .describe('Secret used to sign custom domain challenge payload'),
    jwtSecret: z.string().describe('JWT secret used by devbox backend APIs')
  })
  .strict();

const DevboxMcpSchema = z
  .object({
    forcedLanguage: z.string().optional().describe('Forced MCP language code')
  })
  .strict();

const DevboxSchema = z
  .object({
    ui: DevboxUiSchema.describe('UI related configuration'),
    features: DevboxFeaturesSchema.describe('Feature flag configuration'),
    runtime: DevboxRuntimeSchema.describe('Runtime infrastructure configuration'),
    resources: DevboxResourcesSchema.describe('Resource defaults and limits'),
    components: DevboxComponentsSchema.describe('External component endpoints'),
    userDomain: UserDomainSchema.describe('Default user-facing ingress domain configuration'),
    security: DevboxSecuritySchema.describe('Security related secrets'),
    mcp: DevboxMcpSchema.describe('MCP endpoint settings')
  })
  .strict();

export const AppConfigSchema = z
  .object({
    cloud: CloudSchema.describe('Global cloud configuration'),
    devbox: DevboxSchema.describe('DevBox application configuration')
  })
  .strict();

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type CustomScript = z.infer<typeof CustomScriptSchema>;

export const ClientAppConfigSchema = z
  .object({
    cloud: z
      .object({
        domain: z.string().describe('Primary cloud domain')
      })
      .strict(),
    devbox: z
      .object({
        ui: z
          .object({
            docUrls: z
              .object({
                docs: z.object({ zh: z.string(), en: z.string() }).strict(),
                privacy: z.object({ zh: z.string(), en: z.string() }).strict()
              })
              .strict(),
            currencySymbolType: z.enum(['shellCoin', 'cny', 'usd']),
            customScripts: z.array(CustomScriptSchema)
          })
          .strict(),
        features: DevboxFeaturesSchema,
        runtime: z
          .object({
            rootNamespace: z.string(),
            defaultNamespace: z.string(),
            sshDomain: z.string(),
            registryHost: z.string(),
            webidePort: z.number().int().positive()
          })
          .strict(),
        resources: DevboxResourcesSchema,
        userDomain: UserDomainSchema
      })
      .strict()
  })
  .strict();

export type ClientAppConfig = z.infer<typeof ClientAppConfigSchema>;
