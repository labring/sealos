import { describe, expect, it, vi } from 'vitest';
import { Quantity } from '@sealos/shared';
import { getWorkspaceQuota } from '@/api/workspace';
import request from '@/service/request';
import { WorkspaceQuotaResponseSchema } from '@/types/workspace';

vi.mock('@/service/request', () => ({
  default: vi.fn()
}));

const mockedRequest = vi.mocked(request);

describe('getWorkspaceQuota', () => {
  it('hydrates workspace quota Quantity fields from the API JSON payload', async () => {
    mockedRequest.mockResolvedValueOnce({
      code: 200,
      data: {
        quota: [
          {
            type: 'cpu',
            used: '500m',
            limit: '2'
          }
        ]
      }
    });

    const response = await getWorkspaceQuota({
      regionUid: 'region-1',
      workspace: 'ns-demo'
    });

    const item = response.data?.quota[0];
    expect(item?.used).toBeInstanceOf(Quantity);
    expect(item?.used.formatForDisplay({ format: 'DecimalSI' })).toBe('500m');
    expect(item?.limit).toBeInstanceOf(Quantity);
    expect(item?.limit.formatForDisplay({ format: 'DecimalSI' })).toBe('2');

    const parsedAgain = WorkspaceQuotaResponseSchema.safeParse(response.data);
    expect(parsedAgain.success).toBe(true);
  });
});
