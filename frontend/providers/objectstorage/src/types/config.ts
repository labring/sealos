import { z } from 'zod';

const CloudSchema = z
  .object({
    domain: z.string().describe('Primary cloud domain'),
    port: z.number().int().positive().describe('Cloud HTTPS port')
  })
  .strict();

const ObjectStorageSchema = z
  .object({
    resources: z
      .object({
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
      .strict()
      .describe('Resource defaults for hosting workload'),
    components: z
      .object({
        monitoring: z
          .object({
            url: z.string().describe('Monitoring backend base URL')
          })
          .strict(),
        billing: z
          .object({
            url: z.string().describe('Billing/account backend URL'),
            secret: z.string().describe('Billing/account JWT secret key')
          })
          .strict(),
        appLaunchpad: z
          .object({
            url: z.string().describe('AppLaunchpad backend base URL')
          })
          .strict()
      })
      .strict()
      .describe('External service integrations'),
    realName: z
      .object({
        appTokenJwtKey: z.string().describe('JWT secret used to verify app-token payload')
      })
      .strict()
      .describe('Real-name verification settings'),
    hosting: z
      .object({
        appNamePrefix: z.string().describe('Prefix for generated hosting app name'),
        networkProtocol: z
          .enum(['HTTP', 'HTTPS'])
          .describe('Default external protocol for hosting'),
        networkPort: z.number().int().positive().describe('Default service port for hosting')
      })
      .strict()
      .describe('Hosting app defaults')
  })
  .strict();

export const AppConfigSchema = z
  .object({
    cloud: CloudSchema.describe('Cloud configuration'),
    objectStorage: ObjectStorageSchema.describe('ObjectStorage app configuration')
  })
  .strict();

export type AppConfig = z.infer<typeof AppConfigSchema>;

export const ClientAppConfigSchema = z
  .object({
    cloud: CloudSchema,
    objectStorage: z
      .object({
        resources: z
          .object({
            hostingPodCpuMilliCores: z.number().int().nonnegative(),
            hostingPodMemoryMiB: z.number().int().nonnegative()
          })
          .strict(),
        components: z
          .object({
            monitoring: z.object({ url: z.string() }).strict(),
            appLaunchpad: z.object({ url: z.string() }).strict()
          })
          .strict(),
        hosting: z
          .object({
            appNamePrefix: z.string(),
            networkProtocol: z.enum(['HTTP', 'HTTPS']),
            networkPort: z.number().int().positive()
          })
          .strict()
      })
      .strict()
  })
  .strict();

export type ClientAppConfig = z.infer<typeof ClientAppConfigSchema>;
