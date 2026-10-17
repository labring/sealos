import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import { JoinStatus, Role } from 'prisma/region/generated/client';

vi.mock('@/services/backend/auth', () => ({
  verifyGlobalJwt: vi.fn(),
  ensureGlobalTokenClaims: vi.fn()
}));

vi.mock('@/services/backend/db/init', () => ({
  prisma: {
    userCr: {
      findUnique: vi.fn()
    },
    userWorkspace: {
      findMany: vi.fn()
    }
  }
}));

import handler from '@/pages/api/auth/oauth2/workspaces';
import v1Handler from '@/pages/api/auth/oauth2/v1/workspaces';
import { verifyGlobalJwt, ensureGlobalTokenClaims } from '@/services/backend/auth';
import { prisma } from '@/services/backend/db/init';

const mockVerifyGlobalJwt = verifyGlobalJwt as MockedFunction<typeof verifyGlobalJwt>;
const mockEnsureGlobalTokenClaims = ensureGlobalTokenClaims as MockedFunction<
  typeof ensureGlobalTokenClaims
>;
const mockPrisma = prisma as any;

const createMockRes = () => {
  const res: any = {
    headers: {} as Record<string, string>,
    statusCode: 200,
    body: undefined,
    setHeader: vi.fn((name: string, value: string) => {
      res.headers[name] = value;
    }),
    status: vi.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn((payload: unknown) => {
      res.body = payload;
      return res;
    }),
    end: vi.fn(() => res)
  };
  return res;
};

describe('oauth2 workspaces api handler', () => {
  const mockUserUid = '11111111-1111-4111-8111-111111111111';
  const mockUserCrUid = '22222222-2222-4222-8222-222222222222';

  const mockAccessTokenClaims = {
    token_type: 'access_token' as const,
    sub: mockUserUid,
    user_id: 'user-1',
    client_id: 'client-1',
    scope: 'workspaces'
  };

  const sampleWorkspaces = [
    {
      uid: '33333333-3333-4333-8333-333333333333',
      alias: null,
      createdAt: new Date('2026-03-01T08:00:00.000Z'),
      updatedAt: new Date('2026-03-01T08:00:00.000Z'),
      workspaceUid: 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      userCrUid: mockUserCrUid,
      handlerUid: null,
      role: Role.OWNER,
      status: JoinStatus.IN_WORKSPACE,
      isPrivate: true,
      joinAt: new Date('2026-03-01T08:00:00.000Z'),
      workspace: {
        uid: 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        id: 'ns-admin',
        displayName: '默认工作区',
        createdAt: new Date('2026-03-01T08:00:00.000Z'),
        updatedAt: new Date('2026-03-01T08:00:00.000Z')
      }
    },
    {
      uid: '44444444-4444-4444-8444-444444444444',
      alias: 'AI Team',
      createdAt: new Date('2026-04-12T14:20:00.000Z'),
      updatedAt: new Date('2026-04-12T14:20:00.000Z'),
      workspaceUid: 'bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      userCrUid: mockUserCrUid,
      handlerUid: null,
      role: Role.DEVELOPER,
      status: JoinStatus.IN_WORKSPACE,
      isPrivate: false,
      joinAt: new Date('2026-04-12T14:20:00.000Z'),
      workspace: {
        uid: 'bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        id: 'team-ai-infra',
        displayName: 'AI 基础设施组',
        createdAt: new Date('2026-04-10T10:30:00.000Z'),
        updatedAt: new Date('2026-04-10T10:30:00.000Z')
      }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 405 for non-GET method and sets cache-control no-store headers', async () => {
    const req: any = { method: 'POST', headers: {} };
    const res = createMockRes();

    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(res.setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ error: 'method_not_allowed' });
  });

  it('returns 401 when Authorization header is missing', async () => {
    const req: any = { method: 'GET', headers: {} };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.headers['WWW-Authenticate']).toBe(
      'Bearer error="invalid_token", error_description="Missing bearer token"'
    );
    expect(res.body).toEqual({
      error: 'invalid_token',
      error_description: 'Missing bearer token'
    });
  });

  it('returns 401 when Authorization header is not Bearer', async () => {
    const req: any = { method: 'GET', headers: { authorization: 'Basic dXNlcjpwYXNz' } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.headers['WWW-Authenticate']).toBe(
      'Bearer error="invalid_token", error_description="Missing bearer token"'
    );
    expect(res.body).toEqual({
      error: 'invalid_token',
      error_description: 'Missing bearer token'
    });
  });

  it('returns 401 when Bearer token is empty', async () => {
    const req: any = { method: 'GET', headers: { authorization: 'Bearer   ' } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('invalid_token');
  });

  it('returns 401 when token is invalid or expired', async () => {
    mockVerifyGlobalJwt.mockResolvedValue(null);
    mockEnsureGlobalTokenClaims.mockReturnValue(null);

    const req: any = { method: 'GET', headers: { authorization: 'Bearer expired.token.here' } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.headers['WWW-Authenticate']).toBe(
      'Bearer error="invalid_token", error_description="The access token expired or is invalid"'
    );
    expect(res.body).toEqual({
      error: 'invalid_token',
      error_description: 'The access token expired or is invalid'
    });
  });

  it('returns 401 when token is not an access_token type', async () => {
    mockVerifyGlobalJwt.mockResolvedValue({
      token_type: 'refresh_token',
      sub: mockUserUid,
      user_id: 'user-1',
      client_id: 'client-1'
    } as any);
    mockEnsureGlobalTokenClaims.mockReturnValue(null);

    const req: any = { method: 'GET', headers: { authorization: 'Bearer refresh.token.here' } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('invalid_token');
  });

  it('returns 403 when token has scope but lacks workspaces or read:workspaces', async () => {
    mockVerifyGlobalJwt.mockResolvedValue({
      ...mockAccessTokenClaims,
      scope: 'user:profile openid'
    } as any);
    mockEnsureGlobalTokenClaims.mockReturnValue({
      ...mockAccessTokenClaims,
      scope: 'user:profile openid'
    } as any);

    const req: any = { method: 'GET', headers: { authorization: 'Bearer valid.token' } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.headers['WWW-Authenticate']).toBe(
      'Bearer error="insufficient_scope", scope="workspaces"'
    );
    expect(res.body).toEqual({
      error: 'insufficient_scope',
      error_description: "The request requires the 'workspaces' scope"
    });
  });

  it('allows access when token has read:workspaces scope', async () => {
    mockVerifyGlobalJwt.mockResolvedValue({
      ...mockAccessTokenClaims,
      scope: 'read:workspaces'
    } as any);
    mockEnsureGlobalTokenClaims.mockReturnValue({
      ...mockAccessTokenClaims,
      scope: 'read:workspaces'
    } as any);
    mockPrisma.userCr.findUnique.mockResolvedValue({
      uid: mockUserCrUid,
      crName: 'ns-user',
      userUid: mockUserUid
    });
    mockPrisma.userWorkspace.findMany.mockResolvedValue([]);

    const req: any = { method: 'GET', headers: { authorization: 'Bearer valid.token' }, query: {} };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      workspaces: [],
      total: 0
    });
  });

  it('allows access when token has no scope (backward compatibility)', async () => {
    mockVerifyGlobalJwt.mockResolvedValue({
      ...mockAccessTokenClaims,
      scope: undefined
    } as any);
    mockEnsureGlobalTokenClaims.mockReturnValue({
      ...mockAccessTokenClaims,
      scope: undefined
    } as any);
    mockPrisma.userCr.findUnique.mockResolvedValue({
      uid: mockUserCrUid,
      crName: 'ns-user',
      userUid: mockUserUid
    });
    mockPrisma.userWorkspace.findMany.mockResolvedValue([]);

    const req: any = { method: 'GET', headers: { authorization: 'Bearer valid.token' }, query: {} };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
  });

  it('returns 404 when regional userCr resource is not found', async () => {
    mockVerifyGlobalJwt.mockResolvedValue(mockAccessTokenClaims as any);
    mockEnsureGlobalTokenClaims.mockReturnValue(mockAccessTokenClaims as any);
    mockPrisma.userCr.findUnique.mockResolvedValue(null);

    const req: any = { method: 'GET', headers: { authorization: 'Bearer valid.token' }, query: {} };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      error: 'user_not_found',
      error_description: 'No corresponding regional user resource found'
    });
  });

  it('returns 200 with workspaces list and defaults to IN_WORKSPACE with personal space first', async () => {
    mockVerifyGlobalJwt.mockResolvedValue(mockAccessTokenClaims as any);
    mockEnsureGlobalTokenClaims.mockReturnValue(mockAccessTokenClaims as any);
    mockPrisma.userCr.findUnique.mockResolvedValue({
      uid: mockUserCrUid,
      crName: 'ns-user',
      userUid: mockUserUid
    });
    // Deliberately pass team space first to test that sorting moves personal space to top
    mockPrisma.userWorkspace.findMany.mockResolvedValue([sampleWorkspaces[1], sampleWorkspaces[0]]);

    const req: any = { method: 'GET', headers: { authorization: 'Bearer valid.token' }, query: {} };
    const res = createMockRes();

    await handler(req, res);

    expect(mockPrisma.userWorkspace.findMany).toHaveBeenCalledWith({
      where: {
        userCrUid: mockUserCrUid,
        status: JoinStatus.IN_WORKSPACE
      },
      include: {
        workspace: true
      },
      orderBy: [{ isPrivate: 'desc' }, { createdAt: 'asc' }]
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      workspaces: [
        {
          uid: 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          id: 'ns-admin',
          display_name: '默认工作区',
          role: 'OWNER',
          is_personal: true,
          status: 'IN_WORKSPACE',
          created_at: '2026-03-01T08:00:00.000Z',
          joined_at: '2026-03-01T08:00:00.000Z'
        },
        {
          uid: 'bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          id: 'team-ai-infra',
          display_name: 'AI 基础设施组',
          role: 'DEVELOPER',
          is_personal: false,
          status: 'IN_WORKSPACE',
          created_at: '2026-04-10T10:30:00.000Z',
          joined_at: '2026-04-12T14:20:00.000Z'
        }
      ],
      total: 2
    });
  });

  it('supports status query filter (status=ALL, status=INVITED)', async () => {
    mockVerifyGlobalJwt.mockResolvedValue(mockAccessTokenClaims as any);
    mockEnsureGlobalTokenClaims.mockReturnValue(mockAccessTokenClaims as any);
    mockPrisma.userCr.findUnique.mockResolvedValue({
      uid: mockUserCrUid,
      crName: 'ns-user',
      userUid: mockUserUid
    });
    mockPrisma.userWorkspace.findMany.mockResolvedValue([]);

    // Test status=ALL
    const reqAll: any = {
      method: 'GET',
      headers: { authorization: 'Bearer valid.token' },
      query: { status: 'ALL' }
    };
    const resAll = createMockRes();
    await handler(reqAll, resAll);

    expect(mockPrisma.userWorkspace.findMany).toHaveBeenCalledWith({
      where: {
        userCrUid: mockUserCrUid
      },
      include: {
        workspace: true
      },
      orderBy: [{ isPrivate: 'desc' }, { createdAt: 'asc' }]
    });

    // Test status=INVITED
    const reqInvited: any = {
      method: 'GET',
      headers: { authorization: 'Bearer valid.token' },
      query: { status: 'INVITED' }
    };
    const resInvited = createMockRes();
    await handler(reqInvited, resInvited);

    expect(mockPrisma.userWorkspace.findMany).toHaveBeenCalledWith({
      where: {
        userCrUid: mockUserCrUid,
        status: JoinStatus.INVITED
      },
      include: {
        workspace: true
      },
      orderBy: [{ isPrivate: 'desc' }, { createdAt: 'asc' }]
    });
  });

  it('supports type query filter (type=personal, type=team)', async () => {
    mockVerifyGlobalJwt.mockResolvedValue(mockAccessTokenClaims as any);
    mockEnsureGlobalTokenClaims.mockReturnValue(mockAccessTokenClaims as any);
    mockPrisma.userCr.findUnique.mockResolvedValue({
      uid: mockUserCrUid,
      crName: 'ns-user',
      userUid: mockUserUid
    });
    mockPrisma.userWorkspace.findMany.mockResolvedValue(sampleWorkspaces);

    // Test type=personal
    const reqPersonal: any = {
      method: 'GET',
      headers: { authorization: 'Bearer valid.token' },
      query: { type: 'personal' }
    };
    const resPersonal = createMockRes();
    await handler(reqPersonal, resPersonal);

    expect(resPersonal.statusCode).toBe(200);
    expect(resPersonal.body.workspaces).toHaveLength(1);
    expect(resPersonal.body.workspaces[0].is_personal).toBe(true);
    expect(resPersonal.body.total).toBe(1);

    // Test type=team
    const reqTeam: any = {
      method: 'GET',
      headers: { authorization: 'Bearer valid.token' },
      query: { type: 'team' }
    };
    const resTeam = createMockRes();
    await handler(reqTeam, resTeam);

    expect(resTeam.statusCode).toBe(200);
    expect(resTeam.body.workspaces).toHaveLength(1);
    expect(resTeam.body.workspaces[0].is_personal).toBe(false);
    expect(resTeam.body.total).toBe(1);
  });

  it('returns 500 when database throws an error', async () => {
    mockVerifyGlobalJwt.mockResolvedValue(mockAccessTokenClaims as any);
    mockEnsureGlobalTokenClaims.mockReturnValue(mockAccessTokenClaims as any);
    mockPrisma.userCr.findUnique.mockRejectedValue(new Error('DB Connection Timeout'));

    const req: any = { method: 'GET', headers: { authorization: 'Bearer valid.token' }, query: {} };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      error: 'server_error',
      error_description: 'Internal server error while retrieving workspaces'
    });
  });

  it('v1 endpoint re-exports the exact handler', async () => {
    expect(v1Handler).toBe(handler);
  });
});
