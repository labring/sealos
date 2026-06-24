import { describe, expect, it } from 'vitest';
import { decodeJwt, isJwtToken, signJwt, verifyJwt, verifyJwtOrThrow } from '../../src-server/jwt';

type TestPayload = {
  sub: string;
  user_id: string;
};

describe('server jwt utilities', () => {
  it('signs and verifies HS256 tokens', async () => {
    const token = await signJwt<TestPayload>(
      {
        sub: 'user-uid',
        user_id: 'user-id'
      },
      'test-secret',
      { expiresIn: '1h' }
    );

    const payload = await verifyJwt<TestPayload>(token, 'test-secret');

    expect(payload).toMatchObject({
      sub: 'user-uid',
      user_id: 'user-id'
    });
    expect(payload?.iat).toEqual(expect.any(Number));
    expect(payload?.exp).toEqual(expect.any(Number));
  });

  it('returns null when the secret is wrong', async () => {
    const token = await signJwt({ sub: 'user-uid' }, 'test-secret', { expiresIn: '1h' });

    const payload = await verifyJwt(token, 'wrong-secret');

    expect(payload).toBeNull();
  });

  it('returns null when the token is expired', async () => {
    const token = await signJwt({ sub: 'user-uid' }, 'test-secret', { expiresIn: '-1s' });

    const payload = await verifyJwt(token, 'test-secret');

    expect(payload).toBeNull();
  });

  it('throws when verifyJwtOrThrow receives an invalid token', async () => {
    await expect(verifyJwtOrThrow('invalid-token', 'test-secret')).rejects.toThrow();
  });

  it('decodes payload without verifying the signature', async () => {
    const token = await signJwt(
      {
        sub: 'user-uid',
        role: 'admin'
      },
      'test-secret',
      { expiresIn: '60000' }
    );

    const payload = decodeJwt<{ sub: string; role: string }>(token);

    expect(payload).toMatchObject({
      sub: 'user-uid',
      role: 'admin'
    });
  });

  it('returns null when decoding malformed jwt', () => {
    expect(decodeJwt('not-a-jwt')).toBeNull();
  });

  it('detects compact jwt shape', () => {
    expect(isJwtToken('a.b.c')).toBe(true);
    expect(isJwtToken('a.b')).toBe(false);
  });
});
