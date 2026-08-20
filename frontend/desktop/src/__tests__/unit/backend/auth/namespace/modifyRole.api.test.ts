import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import { JoinStatus, Role } from 'prisma/region/generated/client';
import { UserRole } from '@/types/team';

vi.mock('@/services/backend/auth', () => ({
  verifyAccessToken: vi.fn()
}));

vi.mock('@/services/backend/db/init', () => ({
  globalPrisma: {},
  prisma: {
    userWorkspace: {
      findMany: vi.fn()
    }
  }
}));

vi.mock('@/services/backend/team', () => ({
  modifyBinding: vi.fn(),
  modifyWorkspaceRole: vi.fn()
}));

import handler, {
  getModifyRolePermissionError,
  validateModifyRoleRequest
} from '@/pages/api/auth/namespace/modifyRole';
import { verifyAccessToken } from '@/services/backend/auth';
import { prisma } from '@/services/backend/db/init';
import { modifyBinding, modifyWorkspaceRole } from '@/services/backend/team';

const mockVerifyAccessToken = verifyAccessToken as MockedFunction<typeof verifyAccessToken>;
const mockPrisma = prisma as any;
const mockModifyBinding = modifyBinding as MockedFunction<typeof modifyBinding>;
const mockModifyWorkspaceRole = modifyWorkspaceRole as MockedFunction<typeof modifyWorkspaceRole>;

const createMockRes = () => {
  const res: any = {
    body: undefined,
    json: vi.fn((payload: unknown) => {
      res.body = payload;
      return res;
    })
  };
  return res;
};

describe('namespace modifyRole api handler', () => {
  const managerUserCrUid = '11111111-1111-4111-8111-111111111111';
  const developerUserCrUid = '22222222-2222-4222-8222-222222222222';
  const ownerUserCrUid = '44444444-4444-4444-8444-444444444444';
  const workspaceUid = '33333333-3333-4333-8333-333333333333';
  const workspace = {
    id: 'ns-team'
  };

  const buildUserWorkspace = ({
    userCrUid,
    role,
    crName
  }: {
    userCrUid: string;
    role: Role;
    crName: string;
  }) => ({
    userCrUid,
    workspaceUid,
    role,
    status: JoinStatus.IN_WORKSPACE,
    workspace,
    userCr: {
      crName
    }
  });

  const createModifyRoleReq = ({
    targetUserCrUid,
    tRole
  }: {
    targetUserCrUid: string;
    tRole: UserRole;
  }) => ({
    method: 'POST',
    headers: {},
    body: {
      ns_uid: workspaceUid,
      targetUserCrUid,
      tRole
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateModifyRoleRequest', () => {
    const buildValidBody = () => ({
      ns_uid: workspaceUid,
      targetUserCrUid: developerUserCrUid,
      tRole: UserRole.Owner
    });

    it('rejects invalid target user ids', () => {
      expect(
        validateModifyRoleRequest(
          {
            ...buildValidBody(),
            targetUserCrUid: 'bad-id'
          },
          managerUserCrUid
        )
      ).toEqual({
        ok: false,
        error: {
          code: 400,
          message: 'tUserId is invalid'
        }
      });
    });

    it('rejects missing or invalid target roles', () => {
      expect(
        validateModifyRoleRequest(
          {
            ...buildValidBody(),
            tRole: undefined
          },
          managerUserCrUid
        )
      ).toEqual({
        ok: false,
        error: {
          code: 400,
          message: 'tRole is required'
        }
      });

      expect(
        validateModifyRoleRequest(
          {
            ...buildValidBody(),
            tRole: 99 as UserRole
          },
          managerUserCrUid
        )
      ).toEqual({
        ok: false,
        error: {
          code: 400,
          message: 'tRole is required'
        }
      });
    });

    it('accepts owner as a syntactically valid target role', () => {
      expect(validateModifyRoleRequest(buildValidBody(), managerUserCrUid)).toEqual({
        ok: true,
        data: buildValidBody()
      });
    });

    it('rejects invalid namespace ids', () => {
      expect(
        validateModifyRoleRequest(
          {
            ...buildValidBody(),
            ns_uid: 'bad-id'
          },
          managerUserCrUid
        )
      ).toEqual({
        ok: false,
        error: {
          code: 400,
          message: 'ns_uid is invalid'
        }
      });
    });

    it('rejects changing the requester role', () => {
      expect(
        validateModifyRoleRequest(
          {
            ...buildValidBody(),
            targetUserCrUid: managerUserCrUid
          },
          managerUserCrUid
        )
      ).toEqual({
        ok: false,
        error: {
          code: 403,
          message: 'target user is not self'
        }
      });
    });
  });

  describe('getModifyRolePermissionError', () => {
    it('rejects manager promotion of a developer to owner', () => {
      expect(
        getModifyRolePermissionError({
          requesterRole: UserRole.Manager,
          targetCurrentRole: UserRole.Developer,
          requestedRole: UserRole.Owner,
          isSelf: false
        })
      ).toEqual({
        code: 403,
        message: 'you are not owner'
      });
    });

    it('allows owner promotion of a developer to owner', () => {
      expect(
        getModifyRolePermissionError({
          requesterRole: UserRole.Owner,
          targetCurrentRole: UserRole.Developer,
          requestedRole: UserRole.Owner,
          isSelf: false
        })
      ).toBeNull();
    });

    it('rejects manager modification of a developer to a non-owner role', () => {
      expect(
        getModifyRolePermissionError({
          requesterRole: UserRole.Manager,
          targetCurrentRole: UserRole.Developer,
          requestedRole: UserRole.Manager,
          isSelf: false
        })
      ).toEqual({
        code: 403,
        message: 'you are not owner'
      });
    });

    it('allows owner modification of a developer to a non-owner role', () => {
      expect(
        getModifyRolePermissionError({
          requesterRole: UserRole.Owner,
          targetCurrentRole: UserRole.Developer,
          requestedRole: UserRole.Manager,
          isSelf: false
        })
      ).toBeNull();
    });

    it('rejects manager modification of an owner', () => {
      expect(
        getModifyRolePermissionError({
          requesterRole: UserRole.Manager,
          targetCurrentRole: UserRole.Owner,
          requestedRole: UserRole.Developer,
          isSelf: false
        })
      ).toEqual({
        code: 403,
        message: 'you are not owner'
      });
    });
  });

  it('rejects a manager promoting a developer to owner when tRole is Owner', async () => {
    mockVerifyAccessToken.mockResolvedValue({
      userCrUid: managerUserCrUid
    } as any);
    mockPrisma.userWorkspace.findMany.mockResolvedValue([
      buildUserWorkspace({
        userCrUid: managerUserCrUid,
        role: Role.MANAGER,
        crName: 'manager-cr'
      }),
      buildUserWorkspace({
        userCrUid: developerUserCrUid,
        role: Role.DEVELOPER,
        crName: 'developer-cr'
      })
    ]);
    mockModifyWorkspaceRole.mockResolvedValue(undefined as any);
    mockModifyBinding.mockResolvedValue({} as any);

    const req: any = createModifyRoleReq({
      targetUserCrUid: developerUserCrUid,
      tRole: UserRole.Owner
    });
    const res = createMockRes();

    await handler(req, res);

    expect(res.body).toMatchObject({
      code: 403
    });
    expect(mockModifyWorkspaceRole).not.toHaveBeenCalled();
    expect(mockModifyBinding).not.toHaveBeenCalled();
  });

  it('allows an owner to promote a developer to owner', async () => {
    mockVerifyAccessToken.mockResolvedValue({
      userCrUid: ownerUserCrUid
    } as any);
    mockPrisma.userWorkspace.findMany.mockResolvedValue([
      buildUserWorkspace({
        userCrUid: ownerUserCrUid,
        role: Role.OWNER,
        crName: 'owner-cr'
      }),
      buildUserWorkspace({
        userCrUid: developerUserCrUid,
        role: Role.DEVELOPER,
        crName: 'developer-cr'
      })
    ]);
    mockModifyWorkspaceRole.mockResolvedValue(undefined as any);
    mockModifyBinding.mockResolvedValue({} as any);

    const req: any = createModifyRoleReq({
      targetUserCrUid: developerUserCrUid,
      tRole: UserRole.Owner
    });
    const res = createMockRes();

    await handler(req, res);

    expect(res.body).toEqual({
      code: 200,
      message: 'Successfully',
      data: null
    });
    expect(mockModifyWorkspaceRole).toHaveBeenCalledWith({
      k8s_username: 'developer-cr',
      role: UserRole.Owner,
      action: 'Modify',
      workspaceId: 'ns-team',
      pre_role: UserRole.Developer
    });
    expect(mockModifyBinding).toHaveBeenCalledWith({
      userCrUid: developerUserCrUid,
      workspaceUid,
      role: UserRole.Owner
    });
  });

  it('rejects a manager modifying a developer to a non-owner role', async () => {
    mockVerifyAccessToken.mockResolvedValue({
      userCrUid: managerUserCrUid
    } as any);
    mockPrisma.userWorkspace.findMany.mockResolvedValue([
      buildUserWorkspace({
        userCrUid: managerUserCrUid,
        role: Role.MANAGER,
        crName: 'manager-cr'
      }),
      buildUserWorkspace({
        userCrUid: developerUserCrUid,
        role: Role.DEVELOPER,
        crName: 'developer-cr'
      })
    ]);
    mockModifyWorkspaceRole.mockResolvedValue(undefined as any);
    mockModifyBinding.mockResolvedValue({} as any);

    const req: any = createModifyRoleReq({
      targetUserCrUid: developerUserCrUid,
      tRole: UserRole.Manager
    });
    const res = createMockRes();

    await handler(req, res);

    expect(res.body).toMatchObject({
      code: 403
    });
    expect(mockModifyWorkspaceRole).not.toHaveBeenCalled();
    expect(mockModifyBinding).not.toHaveBeenCalled();
  });

  it('allows an owner to modify a developer to a non-owner role', async () => {
    mockVerifyAccessToken.mockResolvedValue({
      userCrUid: ownerUserCrUid
    } as any);
    mockPrisma.userWorkspace.findMany.mockResolvedValue([
      buildUserWorkspace({
        userCrUid: ownerUserCrUid,
        role: Role.OWNER,
        crName: 'owner-cr'
      }),
      buildUserWorkspace({
        userCrUid: developerUserCrUid,
        role: Role.DEVELOPER,
        crName: 'developer-cr'
      })
    ]);
    mockModifyWorkspaceRole.mockResolvedValue(undefined as any);
    mockModifyBinding.mockResolvedValue({} as any);

    const req: any = createModifyRoleReq({
      targetUserCrUid: developerUserCrUid,
      tRole: UserRole.Manager
    });
    const res = createMockRes();

    await handler(req, res);

    expect(res.body).toEqual({
      code: 200,
      message: 'Successfully',
      data: null
    });
    expect(mockModifyWorkspaceRole).toHaveBeenCalledWith({
      k8s_username: 'developer-cr',
      role: UserRole.Manager,
      action: 'Modify',
      workspaceId: 'ns-team',
      pre_role: UserRole.Developer
    });
    expect(mockModifyBinding).toHaveBeenCalledWith({
      userCrUid: developerUserCrUid,
      workspaceUid,
      role: UserRole.Manager
    });
  });
});
