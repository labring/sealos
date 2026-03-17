import { z } from 'zod';

/**
 * Custom script schema supporting both external and inline scripts.
 * Used with Next.js <Script> component.
 */
const CustomScriptSchema = z.union([
  z.strictObject({
    src: z.string().describe('External script URL'),
    strategy: z
      .enum(['afterInteractive', 'lazyOnload', 'beforeInteractive', 'worker'])
      .optional()
      .describe('Next.js Script loading strategy'),
    id: z.string().describe('Script element ID')
  }),
  z.strictObject({
    content: z
      .string()
      .describe('Inline script HTML content (converted to dangerouslySetInnerHTML at usage)'),
    strategy: z
      .enum(['afterInteractive', 'lazyOnload', 'beforeInteractive', 'worker'])
      .optional()
      .describe('Next.js Script loading strategy'),
    id: z.string().describe('Script element ID')
  })
]);

export type CustomScript = z.infer<typeof CustomScriptSchema>;

/**
 * Cloud configuration schema.
 */
const CloudSchema = z.strictObject({
  domain: z.string().describe('Cloud platform domain (e.g. cloud.sealos.io)'),
  desktopDomain: z.string().describe('Desktop application domain')
});

/**
 * Feature flags schema.
 */
const FeaturesSchema = z.strictObject({
  guide: z.boolean().describe('Whether the interactive guide feature is enabled'),
  showDocument: z.boolean().describe('Whether to show the documentation entry button'),
  fileImport: z.boolean().describe('Whether the MinIO-based file import feature is enabled')
});

/**
 * UI configuration schema for dbprovider.
 */
const UiSchema = z.strictObject({
  currencySymbol: z
    .enum(['shellCoin', 'cny', 'usd'])
    .describe('Currency symbol type displayed in price components'),
  customScripts: z
    .array(CustomScriptSchema)
    .describe('Custom scripts injected via Next.js <Script> component')
});

/**
 * Storage configuration schema.
 */
const StorageSchema = z.strictObject({
  forcedClassName: z
    .string()
    .nullable()
    .describe('Forced Kubernetes StorageClass name for database PVC (nullable)'),
  maxSize: z.number().positive().describe('Maximum storage size in GB')
});

/**
 * Monitoring configuration schema.
 */
const MonitoringSchema = z.strictObject({
  url: z.string().describe('Prometheus monitoring service URL')
});

/**
 * MinIO object storage configuration (server-side only).
 * Moved to components.storage. Enabled state is in features.fileImport.
 */
const MinioStorageSchema = z.strictObject({
  url: z.string().describe('MinIO server URL'),
  port: z.number().int().positive().describe('MinIO server port'),
  useSSL: z.boolean().describe('Whether to use SSL/TLS for MinIO connection'),
  bucketName: z.string().describe('MinIO bucket name for file migration'),
  accessKey: z.string().describe('MinIO access key'),
  secretKey: z.string().describe('MinIO secret key')
});

/**
 * Event analysis configuration (FastGPT, server-side only).
 * Same structure as applaunchpad components.eventAnalysis.
 */
const EventAnalysisSchema = z.strictObject({
  enabled: z.boolean().describe('Whether the FastGPT event analysis feature is enabled'),
  url: z
    .string()
    .describe('FastGPT API base URL without trailing slash, e.g. https://fastgpt.run/api/openapi'),
  modelId: z
    .string()
    .default('6455c433f437e55c638e630c')
    .describe('FastGPT model ID for chat/chat API'),
  fastGPTKey: z.string().describe('FastGPT API key for event analysis')
});

/**
 * Migration job configuration schema.
 */
const MigrationSchema = z.strictObject({
  fetchFileImage: z.string().describe('Docker image for file fetch migration job'),
  importDataImage: z.string().describe('Docker image for data import migration job'),
  jobCpuMillicores: z
    .number()
    .nonnegative()
    .describe('CPU limit for migration jobs, in millicores'),
  jobMemoryMiB: z.number().nonnegative().describe('Memory limit for migration jobs, in MiB'),
  dumpImportCpuMillicores: z
    .number()
    .nonnegative()
    .describe('CPU limit for dump import jobs, in millicores'),
  dumpImportMemoryMiB: z
    .number()
    .nonnegative()
    .describe('Memory limit for dump import jobs, in MiB')
});

/**
 * Backup job configuration schema.
 */
const BackupSchema = z.strictObject({
  enabled: z.boolean().describe('Whether database backup feature is enabled'),
  jobCpuMillicores: z.number().nonnegative().describe('CPU limit for backup jobs, in millicores'),
  jobMemoryMiB: z.number().nonnegative().describe('Memory limit for backup jobs, in MiB')
});

/**
 * Alert service configuration (server-side only).
 */
const AlertSchema = z.strictObject({
  url: z.string().describe('Database alert service URL')
});

/**
 * Billing service configuration.
 */
const BillingSchema = z.strictObject({
  url: z.string().describe('Billing service URL'),
  secret: z.string().describe('Billing service secret (server-side only)')
});

/**
 * Chat2DB managed database configuration.
 */
const Chat2DbSchema = z.strictObject({
  enabled: z.boolean().describe('Whether the Chat2DB managed DB feature is on'),
  aesKey: z.string().describe('AES encryption key for Chat2DB passwords (server-side only)'),
  apiKey: z.string().describe('Chat2DB API key (server-side only)'),
  clientDomainName: z.string().describe('Chat2DB client domain name'),
  gatewayDomainName: z.string().describe('Chat2DB gateway domain name')
});

const ComponentsSchema = z.strictObject({
  monitoring: MonitoringSchema.describe('Prometheus monitoring service URL'),
  alerting: AlertSchema.describe('Database alert service configuration (server-side only)'),
  billing: BillingSchema.describe('Billing service configuration'),
  logging: z
    .strictObject({
      url: z.string().describe('VictoriaLogs base URL for pod log querying (server-side only)')
    })
    .describe('Log querying service configuration (server-side only)'),
  storage: MinioStorageSchema.describe('MinIO object storage configuration (server-side only)'),
  eventAnalysis: EventAnalysisSchema.describe(
    'FastGPT event analysis configuration (server-side only)'
  ),
  chat2db: Chat2DbSchema.describe('Chat2DB managed database feature configuration')
});

/**
 * DbProvider-specific configuration schema.
 */
const DbProviderSchema = z.strictObject({
  features: FeaturesSchema.describe('Feature flags and behavior switches'),
  ui: UiSchema.describe('UI and branding configuration'),
  storage: StorageSchema.describe('Kubernetes storage configuration'),
  components: ComponentsSchema.describe('External component service configuration'),
  migration: MigrationSchema.describe('File migration job configuration'),
  backup: BackupSchema.describe('Database backup configuration')
});

/**
 * Complete application configuration schema.
 * This is the canonical schema for server-side configuration loaded from YAML.
 */
export const AppConfigSchema = z.strictObject({
  cloud: CloudSchema.describe('Common cloud platform configuration'),
  dbprovider: DbProviderSchema.describe('DbProvider application configuration')
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

/**
 * Client-safe application configuration schema.
 * Only includes fields safe to expose to the browser.
 * No credentials, secrets, or internal service URLs.
 */
export const ClientAppConfigSchema = z.strictObject({
  domain: z.string(),
  desktopDomain: z.string(),
  currencySymbol: z.enum(['shellCoin', 'cny', 'usd']),
  guideEnabled: z.boolean(),
  showDocument: z.boolean(),
  fileImportEnabled: z.boolean(),
  forcedStorageClassName: z.string().nullable(),
  storageMaxSize: z.number(),
  monitoringUrl: z.string(),
  migrationJobCpuMillicores: z.number(),
  migrationJobMemoryMiB: z.number(),
  dumpImportJobCpuMillicores: z.number(),
  dumpImportJobMemoryMiB: z.number(),
  backupEnabled: z.boolean(),
  backupJobCpuMillicores: z.number(),
  backupJobMemoryMiB: z.number(),
  billingUrl: z.string(),
  chat2dbEnabled: z.boolean(),
  chat2dbAesKey: z.string(),
  chat2dbClientDomainName: z.string(),
  chat2dbGatewayDomainName: z.string(),
  eventAnalysisEnabled: z.boolean(),
  customScripts: z.array(CustomScriptSchema)
});

export type ClientAppConfig = z.infer<typeof ClientAppConfigSchema>;
