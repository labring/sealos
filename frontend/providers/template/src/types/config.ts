import { z } from 'zod';

/**
 * Slide data schema for carousel configuration.
 * Used to display promotional slides on the homepage.
 */
const SlideDataSchema = z
  .object({
    title: z.string().describe('Slide title displayed in carousel card'),
    desc: z.string().describe('Slide description text'),
    bg: z.string().describe('Background color or image URL for slide card'),
    image: z.string().describe('Main image URL displayed on the right side of slide'),
    borderRadius: z.string().describe('CSS border-radius value for slide card'),
    icon: z.string().describe('Icon image URL shown next to title'),
    templateName: z.string().describe('Template name to navigate to when slide is clicked')
  })
  .strict();

export type SlideData = z.infer<typeof SlideDataSchema>;

/**
 * Carousel configuration schema.
 * Controls the homepage banner carousel display.
 */
const CarouselSchema = z
  .object({
    enabled: z.boolean().describe('Whether to show carousel banner on homepage'),
    slides: z.array(SlideDataSchema).describe('Array of carousel slide items')
  })
  .strict();

export type CarouselConfig = z.infer<typeof CarouselSchema>;

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
        .describe(
          'Inline script HTML content (converted to Script dangerouslySetInnerHTML at usage)'
        ),
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
 * Meta configuration schema (SEO and scripts).
 */
const MetaSchema = z
  .object({
    canonicalUrl: z
      .string()
      .describe('Canonical URL used in og:url, og:image, and twitter:image meta tags'),
    customScripts: z
      .array(CustomScriptSchema)
      .describe(
        'Array of custom scripts injected via Next.js <Script> component. Supports external scripts (src) or inline scripts (dangerouslySetInnerHTML)'
      )
  })
  .strict();

export type MetaConfig = z.infer<typeof MetaSchema>;

/**
 * UI configuration schema.
 */
const UiSchema = z
  .object({
    brandName: z
      .string()
      .describe('Brand name used in page title, meta description, and UI headers'),
    forcedLanguage: z
      .string()
      .optional()
      .describe('Forced language code that overrides user language preference (e.g., "en", "zh")'),
    currencySymbolType: z
      .enum(['shellCoin', 'cny', 'usd'])
      .describe('Currency symbol type displayed in price components (shellCoin/cny/usd)'),
    meta: MetaSchema.describe('SEO meta tags and custom script injection'),
    carousel: CarouselSchema.describe('Homepage carousel banner configuration')
  })
  .strict();

export type UiConfig = z.infer<typeof UiSchema>;

/**
 * Template repository configuration schema.
 * Used to clone/pull template YAML files from Git repository.
 */
const RepoSchema = z
  .object({
    url: z.string().url().describe('Git repository URL containing template YAML files'),
    branch: z.string().describe('Git branch name to checkout'),
    localDir: z.string().describe('Relative path where the template repo is cloned to')
  })
  .strict();

export type RepoConfig = z.infer<typeof RepoSchema>;

/**
 * Feature flags schema.
 * Controls various feature behaviors.
 */
const FeaturesSchema = z
  .object({
    fetchReadme: z
      .boolean()
      .describe('Whether to fetch and cache README content from template repositories'),
    showAuthor: z.boolean().describe('Whether to show author info in templates'),
    guide: z.boolean().describe('Whether to enable interactive guide feature support')
  })
  .strict();

export type FeaturesConfig = z.infer<typeof FeaturesSchema>;

/**
 * Cloud configuration schema.
 * Used for Kubernetes and cloud platform integration.
 */
const CloudSchema = z
  .object({
    domain: z.string().describe('Cloud platform domain used for API calls and resource management'),
    port: z.number().int().positive().describe('Cloud platform API port number'),
    regionUid: z.string().describe('Region unique identifier for multi-region deployments'),
    certSecretName: z
      .string()
      .describe('Kubernetes Secret name containing TLS certificate for ingress')
  })
  .strict();

export type CloudConfig = z.infer<typeof CloudSchema>;

/**
 * Template provider configuration schema.
 */
const TemplateSchema = z
  .object({
    ui: UiSchema.describe('UI and branding configuration'),
    repo: RepoSchema.describe('Template Git repository configuration'),
    features: FeaturesSchema.describe('Feature flags and behavior switches'),
    cdnHost: z
      .string()
      .optional()
      .describe(
        'CDN hostname used to replace GitHub raw URLs for template icons and README files (e.g., "cdn.jsdelivr.net")'
      ),
    excludedCategories: z
      .array(z.string())
      .describe('Template categories to exclude from listing and API responses'),
    sidebarMenuCount: z
      .number()
      .int()
      .nonnegative()
      .describe('Maximum number of category items to display in sidebar navigation menu'),
    desktopDomain: z
      .string()
      .describe(
        'Desktop application domain used for postMessage origin whitelist and app navigation links'
      ),
    billingUrl: z.string().describe('Billing page URL used in guide bonus redemption flow')
  })
  .strict();

export type TemplateConfig = z.infer<typeof TemplateSchema>;

/**
 * Complete application configuration schema.
 * This is the canonical schema for server-side configuration.
 * Use .strict() to reject unknown fields (fail-fast).
 */
export const AppConfigSchema = z
  .object({
    cloud: CloudSchema.describe('Common cloud configuration'),
    template: TemplateSchema.describe('Template provider configuration')
  })
  .strict();

export type AppConfig = z.infer<typeof AppConfigSchema>;

/**
 * Schema for the client sided app config.
 */
export const ClientAppConfigSchema = z
  .object({
    brandName: z.string(),
    carousel: CarouselSchema,
    showAuthor: z.boolean(),
    currencySymbolType: z.enum(['shellCoin', 'cny', 'usd']),
    desktopDomain: z.string()
  })
  .strict();

export type ClientAppConfig = z.infer<typeof ClientAppConfigSchema>;
