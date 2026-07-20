import { describe, expect, it, vi } from 'vitest';

vi.mock('@/services/backend/db/verifyCode', () => ({}));
vi.mock('@/services/backend/db/verificationRateLimit', () => ({}));
vi.mock('@/services/backend/db/verificationTicket', () => ({}));

import { filterCodeUid } from '@/services/backend/middleware/sms';

describe('verification middleware', () => {
  it('rejects a malformed flow ticket uid before querying the database', async () => {
    const json = vi.fn();
    const next = vi.fn();

    await filterCodeUid({ body: { uid: 'not-a-uuid' } } as any, { json } as any, next);

    expect(json).toHaveBeenCalledWith({
      code: 400,
      message: 'uid is invalid',
      data: null
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('passes a valid flow ticket uid to the next handler', async () => {
    const uid = '00000000-0000-4000-8000-000000000001';
    const next = vi.fn();

    await filterCodeUid({ body: { uid } } as any, { json: vi.fn() } as any, next);

    expect(next).toHaveBeenCalledWith({ uid });
  });
});
