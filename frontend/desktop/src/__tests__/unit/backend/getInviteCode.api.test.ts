import { UserRole } from '@/types/team';

jest.mock('@/services/backend/auth', () => ({
  verifyAccessToken: jest.fn()
}));

jest.mock('@/services/backend/db/init', () => ({
  globalPrisma: {},
  prisma: {
    userWorkspace: {
      findMany: jest.fn()
    }
  }
}));

jest.mock('@/services/backend/db/workspaceInviteCode', () => ({
  addOrUpdateInviteCode: jest.fn()
}));

jest.mock('@/services/enable', () => ({
  getWorkspaceInviteExpiresInMinutes: jest.fn()
}));

jest.mock('uuid', () => ({
  validate: jest.fn(() => true),
  v4: jest.fn(() => 'invite-code')
}));

import handler from '@/pages/api/auth/namespace/getInviteCode';
import { verifyAccessToken } from '@/services/backend/auth';
import { prisma } from '@/services/backend/db/init';
import { addOrUpdateInviteCode } from '@/services/backend/db/workspaceInviteCode';
import { getWorkspaceInviteExpiresInMinutes } from '@/services/enable';

const createRes = () => {
  const res: any = {
    body: undefined,
    json: jest.fn((payload) => {
      res.body = payload;
      return res;
    })
  };
  return res;
};

describe('getInviteCode api', () => {
  const req: any = {
    headers: {},
    body: {
      ns_uid: '33333333-3333-4333-8333-333333333333',
      role: UserRole.Developer
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (verifyAccessToken as jest.Mock).mockResolvedValue({
      userUid: '11111111-1111-4111-8111-111111111111',
      userCrUid: '22222222-2222-4222-8222-222222222222'
    });
    (getWorkspaceInviteExpiresInMinutes as jest.Mock).mockReturnValue([30, 1440]);
    (prisma as any).userWorkspace.findMany.mockResolvedValue([
      {
        userCrUid: '22222222-2222-4222-8222-222222222222',
        role: 'OWNER'
      }
    ]);
    (addOrUpdateInviteCode as jest.Mock).mockResolvedValue({});
  });

  it('uses the configured default when no expiry is supplied', async () => {
    const res = createRes();

    await handler(req, res);

    expect(addOrUpdateInviteCode).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'invite-code',
        expiresInMinutes: 30
      })
    );
    expect(res.body.code).toBe(200);
  });

  it('accepts configured expiry values', async () => {
    const res = createRes();

    await handler(
      {
        ...req,
        body: {
          ...req.body,
          expiresInMinutes: 1440
        }
      },
      res
    );

    expect(addOrUpdateInviteCode).toHaveBeenCalledWith(
      expect.objectContaining({
        expiresInMinutes: 1440
      })
    );
    expect(res.body.code).toBe(200);
  });

  it('rejects expiry values outside config', async () => {
    const res = createRes();

    await handler(
      {
        ...req,
        body: {
          ...req.body,
          expiresInMinutes: 60
        }
      },
      res
    );

    expect(addOrUpdateInviteCode).not.toHaveBeenCalled();
    expect(res.body).toEqual({
      code: 400,
      message: 'expiresInMinutes is invalid',
      data: null
    });
  });
});
