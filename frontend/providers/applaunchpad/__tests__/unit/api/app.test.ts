import { describe, expect, it, vi } from 'vitest';
import { Quantity } from '@sealos/shared';
import { getAppByName, getAppPodsByAppName } from '@/api/app';
import { MOCK_APP_DETAIL, MOCK_PODS } from '@/mock/apps';
import { GET } from '@/services/request';

vi.mock('@/services/request', () => ({
  GET: vi.fn(),
  POST: vi.fn(),
  DELETE: vi.fn()
}));

vi.mock('@sealos/gtm', () => ({
  track: vi.fn()
}));

const mockedGET = vi.mocked(GET);

describe('getAppByName', () => {
  it('hydrates Quantity fields from the API JSON payload', async () => {
    const payload = JSON.parse(JSON.stringify(MOCK_APP_DETAIL));
    payload.storeList = [
      {
        name: 'data',
        path: '/data',
        value: '2Gi'
      }
    ];

    mockedGET.mockResolvedValueOnce(payload);

    const app = await getAppByName('hello-world');

    expect(app.cpu).toBeInstanceOf(Quantity);
    expect(app.cpu.formatForDisplay({ format: 'DecimalSI' })).toBe('200m');
    expect(app.memory).toBeInstanceOf(Quantity);
    expect(app.memory.formatForDisplay({ format: 'BinarySI' })).toBe('256Mi');
    expect(app.storeList[0]?.value).toBeInstanceOf(Quantity);
    expect(app.storeList[0]?.value.formatForDisplay({ format: 'BinarySI' })).toBe('2Gi');
  });
});

describe('getAppPodsByAppName', () => {
  it('hydrates pod Quantity fields from the API JSON payload', async () => {
    const payload = JSON.parse(JSON.stringify(MOCK_PODS));
    payload[0].cpu = '500m';
    payload[0].memory = '128Mi';

    mockedGET.mockResolvedValueOnce(payload);

    const pods = await getAppPodsByAppName('hello-world');

    expect(pods[0]?.cpu).toBeInstanceOf(Quantity);
    expect(pods[0]?.cpu.formatForDisplay({ format: 'DecimalSI' })).toBe('500m');
    expect(pods[0]?.memory).toBeInstanceOf(Quantity);
    expect(pods[0]?.memory.formatForDisplay({ format: 'BinarySI' })).toBe('128Mi');
  });
});
