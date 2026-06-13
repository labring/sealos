import { readmeCache } from '@/utils/readmeCache';

type CacheClearer = () => void;

const catalogCacheClearers = new Set<CacheClearer>();

export function registerTemplateCatalogCacheClearer(clearer: CacheClearer) {
  catalogCacheClearers.add(clearer);
  return () => {
    catalogCacheClearers.delete(clearer);
  };
}

export function clearTemplateRuntimeCaches() {
  readmeCache.clear();
  for (const clearer of catalogCacheClearers) {
    try {
      clearer();
    } catch (error) {
      console.error('[template-repo] Failed to clear template cache:', error);
    }
  }
}
