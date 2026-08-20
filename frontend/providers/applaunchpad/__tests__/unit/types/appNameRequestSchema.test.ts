import { describe, expect, it } from 'vitest';
import { CreateLaunchpadRequestSchema } from '@/types/request_schema';
import { CreateLaunchpadRequestSchema as CreateLaunchpadV2AlphaRequestSchema } from '@/types/v2alpha/request_schema';
import { APP_NAME_BASE_MAX_LENGTH } from '@/utils/appNameValidation';

const schemas = [
  ['v1', CreateLaunchpadRequestSchema, { resource: { replicas: 1 } }],
  ['v2alpha', CreateLaunchpadV2AlphaRequestSchema, { quota: { replicas: 1 } }]
] as const;

describe.each(schemas)('%s create app name schema', (_version, schema, minimalPayload) => {
  it('accepts app names up to the service and pod-safe length budget', () => {
    const maxLengthName = `a${'b'.repeat(APP_NAME_BASE_MAX_LENGTH - 1)}`;

    expect(schema.safeParse({ ...minimalPayload, name: 'demo' }).success).toBe(true);
    expect(maxLengthName).toHaveLength(25);
    expect(schema.safeParse({ ...minimalPayload, name: maxLengthName }).success).toBe(true);
  });

  it('rejects app names that would break RFC 1035 service or pod suffix budgets', () => {
    const tooLongName = `a${'b'.repeat(APP_NAME_BASE_MAX_LENGTH)}`;

    expect(schema.safeParse({ ...minimalPayload, name: tooLongName }).success).toBe(false);
    expect(schema.safeParse({ ...minimalPayload, name: '1app' }).success).toBe(false);
    expect(schema.safeParse({ ...minimalPayload, name: 'App' }).success).toBe(false);
    expect(schema.safeParse({ ...minimalPayload, name: 'app_1' }).success).toBe(false);
    expect(schema.safeParse({ ...minimalPayload, name: 'app-' }).success).toBe(false);
    expect(schema.safeParse({ ...minimalPayload, name: 'app.name' }).success).toBe(false);
    expect(schema.safeParse({ ...minimalPayload, name: 'app name' }).success).toBe(false);
  });

  it('keeps the default name valid', () => {
    const result = schema.safeParse(minimalPayload);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('hello-world');
    }
  });
});
