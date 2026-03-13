import { z } from 'zod';

const CloudSchema = z.strictObject({
  domain: z.string().describe('Primary cloud domain'),
  port: z.number().int().positive().describe('Cloud HTTPS port')
});

const ObjectStorageSchema = z.strictObject({
  resources: z
    .strictObject({
      hostingPodCpuMilliCores: z
        .number()
        .int()
        .nonnegative()
        .describe('CPU request/limit for hosting pod in millicores'),
      hostingPodMemoryMiB: z
        .number()
        .int()
        .nonnegative()
        .describe('Memory request/limit for hosting pod in MiB')
    })
    .describe('Resource defaults for hosting workload'),
  components: z
    .strictObject({
      monitoring: z.strictObject({
        url: z.string().describe('Monitoring backend base URL')
      }),
      billing: z.strictObject({
        url: z.string().describe('Billing/account backend URL'),
        secret: z.string().describe('Billing/account JWT secret key')
      }),
      appLaunchpad: z.strictObject({
        url: z.string().describe('AppLaunchpad backend base URL')
      })
    })
    .describe('External service integrations'),
  realName: z
    .strictObject({
      appTokenJwtKey: z.string().describe('JWT secret used to verify app-token payload')
    })
    .describe('Real-name verification settings'),
  hosting: z
    .strictObject({
      appNamePrefix: z.string().describe('Prefix for generated hosting app name'),
      networkProtocol: z.enum(['HTTP', 'HTTPS']).describe('Default external protocol for hosting'),
      networkPort: z.number().int().positive().describe('Default service port for hosting')
    })
    .describe('Hosting app defaults')
});

export const AppConfigSchema = z.strictObject({
  cloud: CloudSchema.describe('Cloud configuration'),
  objectStorage: ObjectStorageSchema.describe('ObjectStorage app configuration')
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export const ClientAppConfigSchema = z.strictObject({
  cloud: CloudSchema,
  objectStorage: z.strictObject({
    resources: z.strictObject({
      hostingPodCpuMilliCores: z.number().int().nonnegative(),
      hostingPodMemoryMiB: z.number().int().nonnegative()
    }),
    components: z.strictObject({
      monitoring: z.strictObject({ url: z.string() }),
      appLaunchpad: z.strictObject({ url: z.string() })
    }),
    hosting: z.strictObject({
      appNamePrefix: z.string(),
      networkProtocol: z.enum(['HTTP', 'HTTPS']),
      networkPort: z.number().int().positive()
    })
  })
});

export type ClientAppConfig = z.infer<typeof ClientAppConfigSchema>;
