import { describe, expect, it } from 'vitest';
import { rewardIdentityKey } from '@/services/backend/activity/identity.cjs';

const pepper = 'a'.repeat(64);
describe('verified reward identity fingerprint', () => {
  it('normalizes personal IDs and never includes the raw ID', () => {
    const a = rewardIdentityKey(pepper, { isVerified: true, idCard: '11010119900101001X' }, null);
    const b = rewardIdentityKey(pepper, { isVerified: true, idCard: ' 11010119900101001x ' }, null);
    expect(a).toBe(b);
    expect(a).toMatch(/^v1:[a-f0-9]{64}$/);
    expect(a).not.toContain('11010119900101001');
  });
  it('uses the verified enterprise subject, with a separate identity namespace', () => {
    const enterprise = (key: string) => ({ isVerified: true, additionalInfo: { key } });
    const a = rewardIdentityKey(pepper, null, enterprise(' 11010119900101001x '));
    expect(a).toBe(rewardIdentityKey(pepper, null, enterprise('11010119900101001X')));
    expect(a).not.toBe(
      rewardIdentityKey(pepper, { isVerified: true, idCard: '11010119900101001X' }, null)
    );
  });
  it.each([null, '', ' ', 'name', '123', '11010119900101001X\nBAD'])(
    'fails closed for missing/malformed personal evidence %s',
    (idCard) => {
      expect(rewardIdentityKey(pepper, { isVerified: true, idCard }, null)).toBeNull();
    }
  );
  it('does not use unverified evidence or company names', () => {
    expect(
      rewardIdentityKey(pepper, { isVerified: false, idCard: '11010119900101001X' }, null)
    ).toBeNull();
    expect(
      rewardIdentityKey(pepper, null, {
        isVerified: true,
        additionalInfo: { enterpriseName: 'Example' }
      })
    ).toBeNull();
    expect(
      rewardIdentityKey(pepper, null, {
        isVerified: false,
        additionalInfo: { key: 'EXAMPLE123456789' }
      })
    ).toBeNull();
  });
  it('never generates a new salt if the persisted secret is missing', () => {
    expect(() => rewardIdentityKey('', null, null)).toThrow('unavailable');
  });
});
