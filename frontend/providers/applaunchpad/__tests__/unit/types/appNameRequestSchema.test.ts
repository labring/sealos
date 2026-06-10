import { describe, expect, it } from 'vitest';
import { CreateLaunchpadRequestSchema } from '@/types/request_schema';
import { CreateLaunchpadRequestSchema as CreateLaunchpadV2AlphaRequestSchema } from '@/types/v2alpha/request_schema';
import { APP_GENERATED_NAME_MAX_LENGTH } from '@/utils/appNameValidation';

const schemas = [
  ['v1', CreateLaunchpadRequestSchema, { resource: { replicas: 1 } }],
  ['v2alpha', CreateLaunchpadV2AlphaRequestSchema, { quota: { replicas: 1 } }]
] as const;

describe.each(schemas)('%s create app name schema', (_version, schema, minimalPayload) => {
  it('accepts final generated app names up to the pod-safe length budget', () => {
    const maxLengthName = `a${'b'.repeat(APP_GENERATED_NAME_MAX_LENGTH - 1)}`;

    expect(schema.safeParse({ ...minimalPayload, name: 'demo-a1b2c3d4' }).success).toBe(true);
    expect(maxLengthName).toHaveLength(47);
    expect(schema.safeParse({ ...minimalPayload, name: maxLengthName }).success).toBe(true);
  });

  it('rejects final app names that would break RFC 1035 or pod suffix budgets', () => {
    const tooLongName = `a${'b'.repeat(APP_GENERATED_NAME_MAX_LENGTH)}`;

    expect(schema.safeParse({ ...minimalPayload, name: tooLongName }).success).toBe(false);
    expect(schema.safeParse({ ...minimalPayload, name: '1app-a1b2c3d4' }).success).toBe(false);
    expect(schema.safeParse({ ...minimalPayload, name: 'App-a1b2c3d4' }).success).toBe(false);
    expect(schema.safeParse({ ...minimalPayload, name: 'app_1-a1b2c3d4' }).success).toBe(false);
    expect(schema.safeParse({ ...minimalPayload, name: 'app-a1b2c3d4-' }).success).toBe(false);
    expect(schema.safeParse({ ...minimalPayload, name: 'app.name-a1b2c3d4' }).success).toBe(false);
    expect(schema.safeParse({ ...minimalPayload, name: 'app name-a1b2c3d4' }).success).toBe(false);
  });

  it('keeps the default name valid', () => {
    const result = schema.safeParse(minimalPayload);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('hello-world');
    }
  });
});
