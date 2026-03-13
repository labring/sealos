import { readTemplates } from '../../listTemplate';
import { TemplateType } from '@/types/app';

interface TemplatesCache {
  data: TemplateType[];
  timestamp: number;
  map: Map<string, TemplateType>;
}

interface TemplateDetailCache {
  data: any;
  timestamp: number;
}

let templatesCache: TemplatesCache | null = null;
let templateDetailCache = new Map<string, TemplateDetailCache>();
let isRefreshingCache = false;
const CACHE_TTL = 5 * 60 * 1000;

export function getCachedTemplates(
  jsonPath: string,
  cdnUrl?: string,
  blacklistedCategories?: string[],
  language?: string
) {
  const now = Date.now();

  if (templatesCache && now - templatesCache.timestamp < CACHE_TTL) {
    return templatesCache;
  }

  if (isRefreshingCache && templatesCache) {
    return templatesCache;
  }

  try {
    isRefreshingCache = true;

    const templates = readTemplates(jsonPath, cdnUrl, blacklistedCategories, language);
    const templateMap = new Map<string, TemplateType>();

    templates.forEach((template) => {
      templateMap.set(template.metadata.name, template);
    });

    templatesCache = {
      data: templates,
      timestamp: now,
      map: templateMap
    };

    return templatesCache;
  } finally {
    isRefreshingCache = false;
  }
}

// Get specific template from cache
export function getTemplateFromCache(templateName: string): TemplateType | undefined {
  if (!templatesCache) {
    return undefined;
  }
  return templatesCache.map.get(templateName);
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
  templatesCache = null;
  templateDetailCache.clear();
}
