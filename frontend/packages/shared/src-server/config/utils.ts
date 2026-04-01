/**
 * Safely mount a value to globalThis.
 * The value should already be readonly (from Zod's readonly()).
 *
 * @param key - Key to mount on globalThis
 * @param value - Value to mount (should be readonly from Zod)
 */
export function mountToGlobalThis<T>(key: string, value: T): void {
  (globalThis as Record<string, unknown>)[key] = value;
}
