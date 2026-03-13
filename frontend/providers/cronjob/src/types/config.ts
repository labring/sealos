import { z } from 'zod';

const CloudSchema = z.strictObject({
  domain: z.string().describe('Cloud platform domain'),
  desktopDomain: z.string().describe('Desktop application domain')
});

const CronjobSchema = z.strictObject({
  podResources: z.strictObject({
    cpuMilliCores: z.number().int().nonnegative().describe('CPU request in millicores'),
    memoryMiB: z.number().int().nonnegative().describe('Memory request in MiB')
  }),
  jobHistory: z.strictObject({
    successfulLimit: z
      .number()
      .int()
      .nonnegative()
      .describe('Number of successful job history to keep'),
    failedLimit: z.number().int().nonnegative().describe('Number of failed job history to keep')
  }),
  components: z
    .strictObject({
      applaunchpad: z.strictObject({
        url: z.string().describe('Applaunchpad URL for navigation links')
      })
    })
    .describe('External component URLs')
});

export const AppConfigSchema = z.strictObject({
  cloud: CloudSchema.describe('Common cloud configuration'),
  cronjob: CronjobSchema.describe('Cronjob provider configuration')
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export const ClientAppConfigSchema = z.strictObject({
  domain: z.string(),
  desktopDomain: z.string(),
  components: z.strictObject({
    applaunchpad: z.strictObject({ url: z.string() })
  }),
  podResources: z.strictObject({
    cpuMilliCores: z.number(),
    memoryMiB: z.number()
  }),
  jobHistory: z.strictObject({
    successfulLimit: z.number(),
    failedLimit: z.number()
  })
});

export type ClientAppConfig = z.infer<typeof ClientAppConfigSchema>;
