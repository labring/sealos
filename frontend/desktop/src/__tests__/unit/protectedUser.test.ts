import { isProtectedAdminUser } from '@/utils/protectedUser';

describe('protected admin user', () => {
  it('protects admin by global user id or region user name', () => {
    expect(isProtectedAdminUser({ userId: 'admin' })).toBe(true);
    expect(isProtectedAdminUser({ userCrName: 'admin' })).toBe(true);
  });

  it('does not protect ordinary users', () => {
    expect(isProtectedAdminUser({ userId: 'alice', userCrName: 'ns-alice' })).toBe(false);
    expect(isProtectedAdminUser({})).toBe(false);
  });
});
