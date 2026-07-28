import {
  isBlockedAdminPasswordAutoSignup,
  normalizePasswordUsername
} from '@/services/backend/passwordUsername';

describe('password username normalization', () => {
  it('trims password usernames', () => {
    expect(normalizePasswordUsername(' admin ').value).toBe('admin');
    expect(normalizePasswordUsername(' admin ').changed).toBe(true);
  });

  it('detects empty and unsafe usernames', () => {
    expect(normalizePasswordUsername('   ').isEmpty).toBe(true);
    expect(normalizePasswordUsername('ad\u200bmin').hasUnsafeCharacters).toBe(true);
    expect(normalizePasswordUsername('admin\ufe0f').hasUnsafeCharacters).toBe(true);
  });

  it('detects admin-like usernames without forcing lowercase for all users', () => {
    const adminLike = normalizePasswordUsername('Admin ');
    const cyrillicAdminLike = normalizePasswordUsername('\u0430dmin');
    const ordinary = normalizePasswordUsername('Alice ');

    expect(adminLike.isAdminLike).toBe(true);
    expect(cyrillicAdminLike.isAdminLike).toBe(true);
    expect(adminLike.value).toBe('Admin');
    expect(ordinary.isAdminLike).toBe(false);
    expect(ordinary.value).toBe('Alice');
  });

  it('blocks missing admin-like users from password auto-signup', () => {
    const normalizedUsername = normalizePasswordUsername('Admin');

    expect(
      isBlockedAdminPasswordAutoSignup({
        normalizedUsername,
        providerExists: false
      })
    ).toBe(true);
    expect(
      isBlockedAdminPasswordAutoSignup({
        normalizedUsername,
        providerExists: true
      })
    ).toBe(false);
  });
});
