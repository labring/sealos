import { z } from 'zod/v4';

const UserDomainSchema = z.strictObject({
  domain: z.string().describe('Ingress domain suffix for generated public domains'),
  secretName: z.string().describe('TLS secret name for wildcard ingress')
});

const CustomScriptSchema = z.union([
  z.strictObject({
    id: z.string().describe('Unique script element ID'),
    src: z.string().describe('External script URL'),
    strategy: z
      .enum(['afterInteractive', 'lazyOnload', 'beforeInteractive', 'worker'])
      .describe('Next.js Script loading strategy')
  }),
  z.strictObject({
    id: z.string().describe('Unique script element ID'),
    content: z.string().describe('Inline script content'),
    strategy: z
      .enum(['afterInteractive', 'lazyOnload', 'beforeInteractive', 'worker'])
      .describe('Next.js Script loading strategy')
  })
]);

const CloudSchema = z.strictObject({
  domain: z.string().describe('Primary cloud domain'),
  port: z.number().int().positive().describe('Cloud HTTPS port'),
  regionUid: z.string().describe('Cloud region UID')
});

const DevboxUiSchema = z.strictObject({
  docUrls: z
    .strictObject({
      docs: z
        .strictObject({
          zh: z.string().describe('Documentation URL for Chinese users'),
          en: z.string().describe('Documentation URL for English users')
        })
        .describe('Public documentation links'),
      privacy: z
        .strictObject({
          zh: z.string().describe('Privacy policy URL for Chinese users'),
          en: z.string().describe('Privacy policy URL for English users')
        })
        .describe('Privacy policy links')
    })
    .describe('Documentation and privacy links'),
  currencySymbol: z.enum(['shellCoin', 'cny', 'usd']).describe('Currency symbol type shown in UI'),
  customScripts: z.array(CustomScriptSchema).describe('Custom scripts injected in root layout')
});

const DevboxFeaturesSchema = z.strictObject({
  guide: z.boolean().describe('Whether in-app guide flow is enabled'),
  importTemplate: z.boolean().describe('Whether template import is enabled'),
  webide: z.boolean().describe('Whether WebIDE feature is enabled'),
  advancedSettings: z.boolean().describe('Whether advanced settings are enabled'),
  affinityScheduling: z.boolean().describe('Whether affinity scheduling is enabled'),
  gpu: z.boolean().describe('Whether GPU pricing should be enabled')
});

const DevboxRuntimeSchema = z.strictObject({
  rootNamespace: z.string().describe('Root runtime namespace'),
  defaultNamespace: z.string().describe('Default user namespace'),
  sshDomain: z.string().describe('SSH endpoint domain'),
  registryHost: z.string().describe('Container registry host'),
  webidePort: z.number().int().positive().describe('WebIDE service port')
});

const DevboxResourcesSchema = z.strictObject({
  storageLimit: z.string().describe('Default PVC storage limit'),
  cpuMarks: z.array(z.number().int().positive()).describe('CPU slider marks'),
  memoryMarks: z.array(z.number().int().positive()).describe('Memory slider marks'),
  storageClassNfs: z.string().describe('NFS storage class name')
});

const DevboxComponentsSchema = z.strictObject({
  appLaunchpad: z.strictObject({
    url: z.string().describe('AppLaunchpad backend URL for create-app requests')
  }),
  monitoring: z.strictObject({
    url: z.string().describe('Monitoring backend URL')
  }),
  retagService: z.strictObject({
    url: z.string().describe('Retag service base URL')
  }),
  billing: z.strictObject({
    url: z.string().describe('Billing backend base URL')
  })
});

const DevboxSecuritySchema = z.strictObject({
  domainChallengeSecret: z.string().describe('Secret used to sign custom domain challenge payload'),
  jwtSecret: z.string().describe('JWT secret used by devbox backend APIs')
});

const DevboxMcpSchema = z.strictObject({
  forcedLanguage: z.string().nullable().describe('Forced MCP language code')
});

const DevboxSchema = z.strictObject({
  ui: DevboxUiSchema.describe('UI related configuration'),
  features: DevboxFeaturesSchema.describe('Feature flag configuration'),
  runtime: DevboxRuntimeSchema.describe('Runtime infrastructure configuration'),
  resources: DevboxResourcesSchema.describe('Resource defaults and limits'),
  components: DevboxComponentsSchema.describe('External component endpoints'),
  userDomain: UserDomainSchema.describe('Default user-facing ingress domain configuration'),
  security: DevboxSecuritySchema.describe('Security related secrets'),
  mcp: DevboxMcpSchema.describe('MCP endpoint settings')
});

export const AppConfigSchema = z.strictObject({
  cloud: CloudSchema.describe('Global cloud configuration'),
  devbox: DevboxSchema.describe('DevBox application configuration')
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type CustomScript = z.infer<typeof CustomScriptSchema>;

export const ClientAppConfigSchema = z.strictObject({
  cloud: z.strictObject({
    domain: z.string().describe('Primary cloud domain')
  }),
  devbox: z.strictObject({
    ui: z.strictObject({
      docUrls: z.strictObject({
        docs: z.strictObject({ zh: z.string(), en: z.string() }),
        privacy: z.strictObject({ zh: z.string(), en: z.string() })
      }),
      currencySymbol: z.enum(['shellCoin', 'cny', 'usd']),
      customScripts: z.array(CustomScriptSchema)
    }),
    features: DevboxFeaturesSchema,
    runtime: z.strictObject({
      rootNamespace: z.string(),
      defaultNamespace: z.string(),
      sshDomain: z.string(),
      registryHost: z.string(),
      webidePort: z.number().int().positive()
    }),
    resources: DevboxResourcesSchema,
    userDomain: UserDomainSchema
  })
});

export type ClientAppConfig = z.infer<typeof ClientAppConfigSchema>;
