import { UserStatus } from 'prisma/global/generated/client';

import { globalPrisma } from '@/services/backend/db/init';
import { retryAuthDatabaseError } from '@/services/backend/authDiagnostics';

export const canUseGlobalAuthToken = async ({ userUid }: { userUid: string }) => {
  const [user, restrictedUser] = await retryAuthDatabaseError(
    'globalAuth.token_status_lookup',
    { userUid },
    () =>
      Promise.all([
        globalPrisma.user.findUnique({
          where: {
            uid: userUid
          },
          select: {
            status: true
          }
        }),
        globalPrisma.restrictedUser.findUnique({
          where: {
            userUid
          },
          select: {
            userUid: true
          }
        })
      ])
  );

  return !!user && user.status === UserStatus.NORMAL_USER && !restrictedUser;
};
