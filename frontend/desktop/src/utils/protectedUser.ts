import type { AccessTokenPayload, GlobalTokenPayload } from '@/types/token';

export const PROTECTED_ADMIN_USER_MESSAGE = 'ADMIN_ACCOUNT_DELETE_FORBIDDEN';

type ProtectedUserPayload = Partial<
  Pick<AccessTokenPayload, 'userId' | 'userCrName'> & Pick<GlobalTokenPayload, 'userId'>
>;

export const isProtectedAdminUser = (payload: ProtectedUserPayload) =>
  payload.userId === 'admin' || payload.userCrName === 'admin';
