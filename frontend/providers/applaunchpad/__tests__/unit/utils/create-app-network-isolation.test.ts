import { describe, expect, it, vi } from 'vitest';
import {
  createAppWithNetworkIsolation,
  NetworkIsolationAfterCreateError
} from '@/utils/create-app-network-isolation';
import type { NetworkIsolationConfig } from '@/types/networkIsolation';

const config: NetworkIsolationConfig = {
  enabled: true,
  rules: []
};

describe('createAppWithNetworkIsolation', () => {
  it('creates the application before reading the revision and saving isolation', async () => {
    const calls: string[] = [];
    const deployApp = vi.fn(async () => calls.push('deploy'));
    const getNetworkIsolation = vi.fn(async () => {
      calls.push('get');
      return { revision: '4' } as any;
    });
    const putNetworkIsolation = vi.fn(async () => {
      calls.push('put');
      return {} as any;
    });

    await createAppWithNetworkIsolation(
      { appName: 'demo', yamlList: ['deployment'], config },
      { deployApp, getNetworkIsolation, putNetworkIsolation }
    );

    expect(calls).toEqual(['deploy', 'get', 'put']);
    expect(putNetworkIsolation).toHaveBeenCalledWith('demo', config, '4');
  });

  it('does not call isolation APIs when the user did not save a draft', async () => {
    const deployApp = vi.fn(async () => undefined);
    const getNetworkIsolation = vi.fn();
    const putNetworkIsolation = vi.fn();

    await createAppWithNetworkIsolation(
      { appName: 'demo', yamlList: ['deployment'] },
      { deployApp, getNetworkIsolation, putNetworkIsolation }
    );

    expect(deployApp).toHaveBeenCalledOnce();
    expect(getNetworkIsolation).not.toHaveBeenCalled();
    expect(putNetworkIsolation).not.toHaveBeenCalled();
  });

  it('retries isolation without deploying again and refreshes the revision each time', async () => {
    const deployApp = vi.fn();
    const getNetworkIsolation = vi
      .fn()
      .mockResolvedValueOnce({ revision: '7' } as any)
      .mockResolvedValueOnce({ revision: '8' } as any);
    const putNetworkIsolation = vi
      .fn()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({} as any);
    const options = {
      appName: 'demo',
      yamlList: [],
      config,
      appAlreadyCreated: true
    };
    const dependencies = { deployApp, getNetworkIsolation, putNetworkIsolation };

    await expect(createAppWithNetworkIsolation(options, dependencies)).rejects.toBeInstanceOf(
      NetworkIsolationAfterCreateError
    );
    await expect(createAppWithNetworkIsolation(options, dependencies)).resolves.toBeUndefined();

    expect(deployApp).not.toHaveBeenCalled();
    expect(getNetworkIsolation).toHaveBeenCalledTimes(2);
    expect(putNetworkIsolation).toHaveBeenNthCalledWith(1, 'demo', config, '7');
    expect(putNetworkIsolation).toHaveBeenNthCalledWith(2, 'demo', config, '8');
  });

  it('does not classify an application deployment failure as an isolation failure', async () => {
    const deploymentError = new Error('deployment failed');

    await expect(
      createAppWithNetworkIsolation(
        { appName: 'demo', yamlList: ['deployment'], config },
        {
          deployApp: vi.fn().mockRejectedValue(deploymentError),
          getNetworkIsolation: vi.fn(),
          putNetworkIsolation: vi.fn()
        }
      )
    ).rejects.toBe(deploymentError);
  });
});
