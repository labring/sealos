import { z } from 'zod';

/**
 * Custom script schema supporting both external and inline scripts.
 * Used with Next.js <Script> component.
 */
const CustomScriptSchema = z.union([
  z
    .object({
      src: z.string().describe('External script URL'),
      strategy: z
        .enum(['afterInteractive', 'lazyOnload', 'beforeInteractive', 'worker'])
        .optional()
        .describe('Next.js Script loading strategy'),
      id: z.string().describe('Script element ID')
    })
    .strict(),
  z
    .object({
      content: z
        .string()
        .describe('Inline script HTML content (converted to dangerouslySetInnerHTML at usage)'),
      strategy: z
        .enum(['afterInteractive', 'lazyOnload', 'beforeInteractive', 'worker'])
        .optional()
        .describe('Next.js Script loading strategy'),
      id: z.string().describe('Script element ID')
    })
    .strict()
]);

export type CustomScript = z.infer<typeof CustomScriptSchema>;

/**
 * Cloud configuration schema.
 */
const CloudSchema = z
  .object({
    domain: z.string().describe('Cloud platform domain (e.g. cloud.sealos.io)'),
    desktopDomain: z.string().describe('Desktop application domain')
  })
  .strict();

/**
 * Feature flags schema.
 */
const FeaturesSchema = z
  .object({
    guide: z.boolean().describe('Whether the interactive guide feature is enabled'),
    showDocument: z.boolean().describe('Whether to show the documentation entry button')
  })
  .strict();

/**
 * UI configuration schema for dbprovider.
 */
const UiSchema = z
  .object({
    currencySymbol: z
      .enum(['shellCoin', 'cny', 'usd'])
      .describe('Currency symbol type displayed in price components'),
    customScripts: z
      .array(CustomScriptSchema)
      .describe('Custom scripts injected via Next.js <Script> component')
  })
  .strict();

/**
 * Storage configuration schema.
 */
const StorageSchema = z
  .object({
    className: z.string().describe('Kubernetes StorageClass name for database PVC'),
    maxSize: z.number().positive().describe('Maximum storage size in GB')
  })
  .strict();

/**
 * Monitoring configuration schema.
 */
const MonitoringSchema = z
  .object({
    url: z.string().describe('Prometheus monitoring service URL')
  })
  .strict();

/**
 * MinIO object storage configuration (server-side only).
 */
const MinioSchema = z
  .object({
    enabled: z.boolean().describe('Whether the MinIO-based file import feature is enabled'),
    url: z.string().describe('MinIO server URL'),
    port: z.number().int().positive().describe('MinIO server port'),
    useSSL: z.boolean().describe('Whether to use SSL/TLS for MinIO connection'),
    bucketName: z.string().describe('MinIO bucket name for file migration'),
    accessKey: z.string().describe('MinIO access key'),
    secretKey: z.string().describe('MinIO secret key')
  })
  .strict();

/**
 * Migration job configuration schema.
 */
const MigrationSchema = z
  .object({
    fetchFileImage: z.string().describe('Docker image for file fetch migration job'),
    importDataImage: z.string().describe('Docker image for data import migration job'),
    jobCpuRequirement: z
      .number()
      .nonnegative()
      .describe('CPU limit (millicores) for migration jobs'),
    jobMemoryRequirement: z
      .number()
      .nonnegative()
      .describe('Memory limit (MiB) for migration jobs'),
    dumpImportCpuRequirement: z
      .number()
      .nonnegative()
      .describe('CPU limit (millicores) for dump import jobs'),
    dumpImportMemoryRequirement: z
      .number()
      .nonnegative()
      .describe('Memory limit (MiB) for dump import jobs')
  })
  .strict();

/**
 * Backup job configuration schema.
 */
const BackupSchema = z
  .object({
    enabled: z.boolean().describe('Whether database backup feature is enabled'),
    jobCpuRequirement: z.number().nonnegative().describe('CPU limit (millicores) for backup jobs'),
    jobMemoryRequirement: z.number().nonnegative().describe('Memory limit (MiB) for backup jobs')
  })
  .strict();

/**
 * Alert service configuration (server-side only).
 */
const AlertSchema = z
  .object({
    url: z.string().describe('Database alert service URL')
  })
  .strict();

/**
 * Billing service configuration.
 */
const BillingSchema = z
  .object({
    url: z.string().describe('Billing service URL'),
    secret: z.string().describe('Billing service secret (server-side only)')
  })
  .strict();

/**
 * Chat2DB managed database configuration.
 */
const Chat2DbSchema = z
  .object({
    enabled: z.boolean().describe('Whether the Chat2DB managed DB feature is on'),
    aesKey: z.string().describe('AES encryption key for Chat2DB passwords (server-side only)'),
    apiKey: z.string().describe('Chat2DB API key (server-side only)'),
    clientDomainName: z.string().describe('Chat2DB client domain name'),
    gatewayDomainName: z.string().describe('Chat2DB gateway domain name')
  })
  .strict();

const ComponentsSchema = z
  .object({
    monitoring: MonitoringSchema.describe('Prometheus monitoring service URL'),
    alerting: AlertSchema.describe('Database alert service configuration (server-side only)'),
    billing: BillingSchema.describe('Billing service configuration'),
    logging: z
      .object({
        url: z.string().describe('VictoriaLogs base URL for pod log querying (server-side only)')
      })
      .strict()
      .describe('Log querying service configuration (server-side only)')
  })
  .strict();

const IntegrationsSchema = z
  .object({
    fastGPTKey: z.string().describe('FastGPT integration API key (server-side only)')
  })
  .strict();

/**
 * DbProvider-specific configuration schema.
 */
const DbProviderSchema = z
  .object({
    features: FeaturesSchema.describe('Feature flags and behavior switches'),
    ui: UiSchema.describe('UI and branding configuration'),
    storage: StorageSchema.describe('Kubernetes storage configuration'),
    components: ComponentsSchema.describe('External component service configuration'),
    minio: MinioSchema.describe('MinIO object storage configuration (server-side only)'),
    migration: MigrationSchema.describe('File migration job configuration'),
    backup: BackupSchema.describe('Database backup configuration'),
    chat2db: Chat2DbSchema.describe('Chat2DB managed database feature configuration'),
    integrations: IntegrationsSchema.describe(
      'Third-party integration configuration (server-side only)'
    )
  })
  .strict();

/**
 * Complete application configuration schema.
 * This is the canonical schema for server-side configuration loaded from YAML.
 */
export const AppConfigSchema = z
  .object({
    cloud: CloudSchema.describe('Common cloud platform configuration'),
    dbprovider: DbProviderSchema.describe('DbProvider application configuration')
  })
  .strict();

export type AppConfig = z.infer<typeof AppConfigSchema>;

/**
 * Client-safe application configuration schema.
 * Only includes fields safe to expose to the browser.
 * No credentials, secrets, or internal service URLs.
 */
export const ClientAppConfigSchema = z
  .object({
    domain: z.string(),
    desktopDomain: z.string(),
    currencySymbol: z.enum(['shellCoin', 'cny', 'usd']),
    guideEnabled: z.boolean(),
    showDocument: z.boolean(),
    storageClassName: z.string(),
    storageMaxSize: z.number(),
    monitoringUrl: z.string(),
    migrationJobCpu: z.number(),
    migrationJobMemory: z.number(),
    dumpImportJobCpu: z.number(),
    dumpImportJobMemory: z.number(),
    minioEnabled: z.boolean(),
    backupEnabled: z.boolean(),
    backupJobCpu: z.number(),
    backupJobMemory: z.number(),
    billingUrl: z.string(),
    chat2dbEnabled: z.boolean(),
    chat2dbAesKey: z.string(),
    chat2dbClientDomainName: z.string(),
    chat2dbGatewayDomainName: z.string(),
    customScripts: z.array(CustomScriptSchema)
  })
  .strict();

export type ClientAppConfig = z.infer<typeof ClientAppConfigSchema>;
