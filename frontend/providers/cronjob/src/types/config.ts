import { z } from 'zod';

const CloudSchema = z
  .object({
    domain: z.string().describe('Cloud platform domain'),
    desktopDomain: z.string().describe('Desktop application domain')
  })
  .strict();

const CronjobSchema = z
  .object({
    podResources: z
      .object({
        cpuMilliCores: z.number().int().nonnegative().describe('CPU request in millicores'),
        memoryMiB: z.number().int().nonnegative().describe('Memory request in MiB')
      })
      .strict(),
    jobHistory: z
      .object({
        successfulLimit: z
          .number()
          .int()
          .nonnegative()
          .describe('Number of successful job history to keep'),
        failedLimit: z.number().int().nonnegative().describe('Number of failed job history to keep')
      })
      .strict(),
    components: z
      .object({
        applaunchpad: z
          .object({
            url: z.string().describe('Applaunchpad URL for navigation links')
          })
          .strict()
      })
      .strict()
      .describe('External component URLs')
  })
  .strict();

export const AppConfigSchema = z
  .object({
    cloud: CloudSchema.describe('Common cloud configuration'),
    cronjob: CronjobSchema.describe('Cronjob provider configuration')
  })
  .strict();

export type AppConfig = z.infer<typeof AppConfigSchema>;

export const ClientAppConfigSchema = z
  .object({
    domain: z.string(),
    desktopDomain: z.string(),
    components: z
      .object({
        applaunchpad: z.object({ url: z.string() }).strict()
      })
      .strict(),
    podResources: z
      .object({
        cpuMilliCores: z.number(),
        memoryMiB: z.number()
      })
      .strict(),
    jobHistory: z
      .object({
        successfulLimit: z.number(),
        failedLimit: z.number()
      })
      .strict()
  })
  .strict();

export type ClientAppConfig = z.infer<typeof ClientAppConfigSchema>;
