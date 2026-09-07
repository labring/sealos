// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { UpdateAppResourcesSchema as V1UpdateAppResourcesSchema } from '@/types/request_schema';
import { UpdateAppResourcesSchema as V2AlphaUpdateAppResourcesSchema } from '@/types/v2alpha/request_schema';

describe('app env schema', () => {
  it('rejects duplicate v1 environment variable names', () => {
    const result = V1UpdateAppResourcesSchema.safeParse({
      env: [
        { name: 'DATABASE_URL', value: 'postgres://first' },
        { name: ' DATABASE_URL ', value: 'postgres://second' }
      ]
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      message: 'Duplicate environment variable name: DATABASE_URL',
      path: ['env', 1, 'name']
    });
  });

  it('rejects duplicate v2alpha environment variable names', () => {
    const result = V2AlphaUpdateAppResourcesSchema.safeParse({
      env: [
        { name: 'DATABASE_URL', value: 'postgres://first' },
        { name: ' DATABASE_URL ', value: 'postgres://second' }
      ]
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      message: 'Duplicate environment variable name: DATABASE_URL',
      path: ['env', 1, 'name']
    });
  });

  it('accepts distinct environment variable names', () => {
    const result = V1UpdateAppResourcesSchema.safeParse({
      env: [
        { name: 'DATABASE_URL', value: 'postgres://first' },
        { name: 'REDIS_URL', value: 'redis://cache' }
      ]
    });

    expect(result.success).toBe(true);
  });
});
