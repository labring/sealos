export const STORAGE_DEFAULT_FALLBACK_GI = 20;

const parseValidStorageGi = (value: number | string | undefined | null) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

export const normalizeStorageDefaultGi = (
  value: number | string | undefined | null,
  fallback = STORAGE_DEFAULT_FALLBACK_GI
) => {
  const normalizedFallback = parseValidStorageGi(fallback) ?? STORAGE_DEFAULT_FALLBACK_GI;
  return parseValidStorageGi(value) ?? normalizedFallback;
};
