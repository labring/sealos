import type { AccessTokenPayload } from '@/types/token';

const adminPayload: AccessTokenPayload = {
  regionUid: 'region-uid',
  userCrUid: 'user-cr-uid',
  userCrName: 'admin',
  workspaceUid: 'workspace-uid',
  workspaceId: 'workspace-id',
  userUid: 'user-uid',
  userId: 'admin'
};

const filterAccessTokenMock = jest.fn(async (_req, _res, next) => next(adminPayload));
const accountBalanceGuardMock = jest.fn();
const resourceGuardMock = jest.fn();
const otherRegionResourceGuardMock = jest.fn();
const filterForceDeleteMock = jest.fn();
const allRegionResourceSvcMock = jest.fn();
const deleteUserSvcMock = jest.fn();
const forceDeleteUserSvcMock = jest.fn();

jest.mock('@/services/backend/middleware/access', () => ({
  filterAccessToken: filterAccessTokenMock
}));

jest.mock('@/services/backend/middleware/amount', () => ({
  accountBalanceGuard: accountBalanceGuardMock
}));

jest.mock('@/services/backend/middleware/checkResource', () => ({
  resourceGuard: resourceGuardMock,
  otherRegionResourceGuard: otherRegionResourceGuardMock,
  filterForceDelete: filterForceDeleteMock
}));

jest.mock('@/services/backend/svc/checkResource', () => ({
  allRegionResourceSvc: allRegionResourceSvcMock
}));

jest.mock('@/services/backend/svc/deleteUser', () => ({
  deleteUserSvc: deleteUserSvcMock,
  forceDeleteUserSvc: forceDeleteUserSvcMock
}));

const createMockResponse = () => {
  const res = {
    json: jest.fn()
  };
  return res as any;
};

describe('admin account delete API protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks admin before regular delete guards run', async () => {
    const { default: handler } = await import('@/pages/api/auth/delete');
    const res = createMockResponse();

    await handler({} as any, res);

    expect(res.json).toHaveBeenCalledWith({
      code: 403,
      message: 'ADMIN_ACCOUNT_DELETE_FORBIDDEN',
      data: null
    });
    expect(accountBalanceGuardMock).not.toHaveBeenCalled();
    expect(resourceGuardMock).not.toHaveBeenCalled();
    expect(otherRegionResourceGuardMock).not.toHaveBeenCalled();
    expect(deleteUserSvcMock).not.toHaveBeenCalled();
  });

  it('blocks admin before resource preflight runs', async () => {
    const { default: handler } = await import('@/pages/api/auth/delete/checkAllResource');
    const res = createMockResponse();

    await handler({} as any, res);

    expect(res.json).toHaveBeenCalledWith({
      code: 403,
      message: 'ADMIN_ACCOUNT_DELETE_FORBIDDEN',
      data: null
    });
    expect(allRegionResourceSvcMock).not.toHaveBeenCalled();
  });

  it('blocks admin before force-delete code validation runs', async () => {
    const { default: handler } = await import('@/pages/api/auth/delete/force');
    const res = createMockResponse();

    await handler({} as any, res);

    expect(res.json).toHaveBeenCalledWith({
      code: 403,
      message: 'ADMIN_ACCOUNT_DELETE_FORBIDDEN',
      data: null
    });
    expect(filterForceDeleteMock).not.toHaveBeenCalled();
    expect(forceDeleteUserSvcMock).not.toHaveBeenCalled();
  });
});
