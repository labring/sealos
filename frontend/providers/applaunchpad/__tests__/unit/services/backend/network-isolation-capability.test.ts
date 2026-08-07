import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getNetworkIsolationMode,
  isNetworkIsolationAvailable,
  resetNetworkIsolationCapabilityCache
} from '@/services/backend/networkIsolationCapability';
import type { AppConfigType } from '@/types';

const config = (mode?: 'auto' | 'disabled') =>
  ({
    launchpad: {
      ...(mode ? { networkIsolation: { mode } } : {})
    }
  }) as Pick<AppConfigType, 'launchpad'>;

describe('network isolation capability', () => {
  beforeEach(() => {
    resetNetworkIsolationCapabilityCache();
    vi.restoreAllMocks();
  });

  it('defaults missing configuration to auto', () => {
    expect(getNetworkIsolationMode(config())).toBe('auto');
  });

  it('does not read the CRD when explicitly disabled', async () => {
    const readCrd = vi.fn().mockResolvedValue(true);

    await expect(
      isNetworkIsolationAvailable({ config: config('disabled'), readCrd })
    ).resolves.toBe(false);
    expect(readCrd).not.toHaveBeenCalled();
  });

  it('enables auto mode only when the CRD can be read', async () => {
    await expect(
      isNetworkIsolationAvailable({ config: config('auto'), readCrd: async () => true })
    ).resolves.toBe(true);
  });

  it.each([
    Object.assign(new Error('not found'), { statusCode: 404 }),
    Object.assign(new Error('forbidden'), { statusCode: 403 }),
    Object.assign(new Error('timeout'), { statusCode: 504 })
  ])('fails closed when CRD detection fails', async (error) => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(
      isNetworkIsolationAvailable({
        config: config('auto'),
        readCrd: async () => Promise.reject(error)
      })
    ).resolves.toBe(false);
  });

  it('caches the capability for 30 seconds and refreshes after expiry', async () => {
    const readCrd = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await expect(
      isNetworkIsolationAvailable({ config: config('auto'), now: 1_000, readCrd })
    ).resolves.toBe(true);
    await expect(
      isNetworkIsolationAvailable({ config: config('auto'), now: 30_999, readCrd })
    ).resolves.toBe(true);
    await expect(
      isNetworkIsolationAvailable({ config: config('auto'), now: 31_000, readCrd })
    ).resolves.toBe(false);
    expect(readCrd).toHaveBeenCalledTimes(2);
  });
});
