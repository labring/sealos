import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCommonClientConfig } from '@/pages/api/platform/getCommonConfig';
import { DefaultCommonClientConfig } from '@/types/system';
import type { AppConfigType } from '@/types/system';

const { readFile } = vi.hoisted(() => ({ readFile: vi.fn() }));
vi.mock('fs', () => ({ readFileSync: readFile }));

const originalConfig = global.AppConfig;
afterEach(() => {
  global.AppConfig = originalConfig;
  vi.restoreAllMocks();
  readFile.mockReset();
});

describe('account merge client configuration', () => {
  it.each([undefined, false, null, 'true', 'false', 1, 0])(
    'keeps merge disabled for %s',
    async (value) => {
      global.AppConfig = { common: { accountMergeEnabled: value } } as AppConfigType;
      expect((await getCommonClientConfig()).accountMergeEnabled).toBe(false);
    }
  );

  it('enables merge only for boolean true and preserves existing flags', async () => {
    global.AppConfig = {
      common: { accountMergeEnabled: true, guideEnabled: true, rechargeEnabled: true }
    } as AppConfigType;
    expect(await getCommonClientConfig()).toMatchObject({
      accountMergeEnabled: true,
      guideEnabled: true,
      rechargeEnabled: true
    });
  });

  it('reads the flag from the existing YAML config loader', async () => {
    global.AppConfig = undefined as unknown as AppConfigType;
    readFile.mockReturnValue('common:\n  accountMergeEnabled: true\n');
    expect((await getCommonClientConfig()).accountMergeEnabled).toBe(true);
    expect(readFile).toHaveBeenCalledOnce();
  });

  it('falls back to disabled when configuration cannot be read', async () => {
    global.AppConfig = undefined as unknown as AppConfigType;
    readFile.mockImplementation(() => {
      throw new Error('unreadable config');
    });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(await getCommonClientConfig()).toBe(DefaultCommonClientConfig);
    expect(DefaultCommonClientConfig.accountMergeEnabled).toBe(false);
  });
});
