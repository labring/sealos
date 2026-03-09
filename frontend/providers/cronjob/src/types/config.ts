import { z } from 'zod';

const CloudSchema = z
  .object({
    domain: z.string().describe('Cloud platform domain')
  })
  .strict();

const CronjobSchema = z
  .object({
    applaunchpadUrl: z.string().describe('Applaunchpad URL for navigation links'),
    podCpuRequest: z
      .number()
      .int()
      .nonnegative()
      .describe('CPU request for cronjob pods in millicores'),
    podMemoryRequest: z
      .number()
      .int()
      .nonnegative()
      .describe('Memory request for cronjob pods in MiB'),
    jobHistory: z
      .object({
        successfulLimit: z
          .number()
          .int()
          .nonnegative()
          .describe('Number of successful job history to keep'),
        failedLimit: z.number().int().nonnegative().describe('Number of failed job history to keep')
      })
      .strict()
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
    applaunchpadUrl: z.string(),
    podCpuRequest: z.number(),
    podMemoryRequest: z.number(),
    successfulJobsHistoryLimit: z.number(),
    failedJobsHistoryLimit: z.number()
  })
  .strict();

export type ClientAppConfig = z.infer<typeof ClientAppConfigSchema>;
