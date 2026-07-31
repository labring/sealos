import { readTemplatesFromFile } from '../../listTemplate';
import { TemplateType } from '@/types/app';
import type { TemplateCategory } from '@/types/config';
import type { TemplateRepo } from '@/utils/templateAsset';

interface TemplatesCache {
  data: TemplateType[];
  timestamp: number;
  map: Map<string, TemplateType>;
}

interface TemplateDetailCache {
  data: any;
  timestamp: number;
}

const templatesCache = new Map<string, TemplatesCache>();
let templateDetailCache = new Map<string, TemplateDetailCache>();
const refreshingCacheKeys = new Set<string>();
const CACHE_TTL = 5 * 60 * 1000;

function getTemplatesCacheKey({
  jsonPath,
  cdnUrl,
  configuredCategories,
  language,
  templateRepo,
  catalogVersion
}: {
  jsonPath: string;
  cdnUrl?: string;
  configuredCategories: TemplateCategory[];
  language?: string;
  templateRepo?: TemplateRepo;
  catalogVersion?: string;
}) {
  return JSON.stringify({
    jsonPath,
    cdnUrl: cdnUrl || '',
    categorySlugs: configuredCategories.map((category) => category.slug),
    language: language || '',
    templateRepo: templateRepo
      ? {
          url: templateRepo.url,
          branch: templateRepo.branch
        }
      : null,
    catalogVersion: catalogVersion || ''
  });
}

export function getCachedTemplates(
  jsonPath: string,
  cdnUrl?: string,
  configuredCategories: TemplateCategory[] = [],
  language?: string,
  templateRepo?: TemplateRepo,
  catalogVersion?: string
) {
  const now = Date.now();
  const cacheKey = getTemplatesCacheKey({
    jsonPath,
    cdnUrl,
    configuredCategories,
    language,
    templateRepo,
    catalogVersion
  });
  const cachedTemplates = templatesCache.get(cacheKey);

  if (cachedTemplates && now - cachedTemplates.timestamp < CACHE_TTL) {
    return cachedTemplates;
  }

  if (refreshingCacheKeys.has(cacheKey) && cachedTemplates) {
    return cachedTemplates;
  }

  try {
    refreshingCacheKeys.add(cacheKey);

    const templates = readTemplatesFromFile(
      jsonPath,
      cdnUrl,
      configuredCategories,
      language,
      templateRepo
    );
    const templateMap = new Map<string, TemplateType>();

    templates.forEach((template) => {
      templateMap.set(template.metadata.name, template);
    });

    const cacheResult = {
      data: templates,
      timestamp: now,
      map: templateMap
    };
    templatesCache.set(cacheKey, cacheResult);

    return cacheResult;
  } finally {
    refreshingCacheKeys.delete(cacheKey);
  }
}

// Get specific template from cache
export function getTemplateFromCache(
  cache: TemplatesCache,
  templateName: string
): TemplateType | undefined {
  return cache.map.get(templateName);
}

// Get cached template detail
export function getCachedTemplateDetail(cacheKey: string): any | null {
  const cached = templateDetailCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  return null;
}

// Set template detail cache
export function setCachedTemplateDetail(cacheKey: string, data: any): void {
  templateDetailCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
}

// Clear all caches
export function clearTemplateCache(): void {
  templatesCache.clear();
  templateDetailCache.clear();
  refreshingCacheKeys.clear();
}
