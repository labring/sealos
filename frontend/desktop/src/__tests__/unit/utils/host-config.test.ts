import { useConfigStore } from '@/stores/config';
import { getHostConfig } from '@/utils/hostConfig';
import type { LayoutConfigType, CloudConfigType } from '@/types';

jest.mock('@/api/platform', () => ({ getAppConfig: jest.fn() }));

const layout = (value: Partial<LayoutConfigType>) => value as LayoutConfigType;

beforeEach(() => {
  useConfigStore.setState({ isLoaded: false, layoutConfig: undefined, cloudConfig: undefined });
});
afterEach(() => jest.useRealTimers());

describe('Desktop host configuration', () => {
  it.each(['shellCoin', 'cny', 'usd'] as const)(
    'passes through %s and existing fields',
    async (currencySymbol) => {
      useConfigStore.setState({
        isLoaded: true,
        layoutConfig: layout({
          currencySymbol,
          gtmId: 'GTM-test'
        }),
        cloudConfig: {
          domain: 'example.com',
          port: '443',
          regionUID: 'region-1'
        } as CloudConfigType
      });
      expect(await getHostConfig()).toEqual({
        currencySymbol,
        cloud: { domain: 'example.com', port: '443', regionUid: 'region-1' },
        features: { subscription: false, analytics: true }
      });
    }
  );

  it('falls back only for a loaded configuration without a symbol', async () => {
    useConfigStore.setState({ isLoaded: true });
    expect(await getHostConfig()).toEqual({
      currencySymbol: 'shellCoin',
      cloud: { domain: '', port: '', regionUid: '' },
      features: { subscription: false, analytics: false }
    });
  });

  it('waits for initialization and reads fresh configuration on later calls', async () => {
    const resolved = jest.fn();
    const pending = getHostConfig().then(resolved);
    await Promise.resolve();
    expect(resolved).not.toHaveBeenCalled();
    useConfigStore.setState({ isLoaded: true, layoutConfig: layout({ currencySymbol: 'usd' }) });
    await pending;
    expect(resolved.mock.calls[0][0].currencySymbol).toBe('usd');
    useConfigStore.setState({ layoutConfig: layout({ currencySymbol: 'cny' }) });
    expect((await getHostConfig()).currencySymbol).toBe('cny');
  });

  it('rejects an unloaded configuration and allows a subsequent retry', async () => {
    jest.useFakeTimers();
    const pending = expect(getHostConfig()).rejects.toThrow('Desktop configuration is not loaded');
    await jest.advanceTimersByTimeAsync(8000);
    await pending;
    expect(jest.getTimerCount()).toBe(0);
    useConfigStore.setState({ isLoaded: true, layoutConfig: layout({ currencySymbol: 'usd' }) });
    expect((await getHostConfig()).currencySymbol).toBe('usd');
  });
});
