import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  modify: vi.fn(),
  unbind: vi.fn(),
  globalPrisma: {
    workspaceUsage: { findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn()
  },
  prisma: { userWorkspace: { findMany: vi.fn(), findFirst: vi.fn() } }
}));
vi.mock('@/services/backend/db/init', () => mocks);
vi.mock('@/services/backend/auth', () => ({ verifyAccessToken: mocks.verify }));
vi.mock('@/services/backend/team', () => ({
  modifyWorkspaceRole: mocks.modify,
  unbindingRole: mocks.unbind
}));
vi.mock('@/services/enable', () => ({ getRegionUid: () => 'region' }));
vi.mock('@/services/backend/response', () => ({
  jsonRes: (res: any, body: unknown) => {
    res.body = body;
  }
}));

import handler from '@/pages/api/auth/namespace/removeUser';

const workspaceUid = '11111111-1111-4111-8111-111111111111';
const ownerUid = '22222222-2222-4222-8222-222222222222';
const memberUid = '33333333-3333-4333-8333-333333333333';
const owner = {
  userCrUid: ownerUid,
  isPrivate: true,
  role: 'OWNER',
  status: 'IN_WORKSPACE',
  userCr: { uid: ownerUid, userUid: 'owner-user', crName: 'owner' },
  workspace: { id: 'ns-private' }
};
const member = {
  ...owner,
  userCrUid: memberUid,
  role: 'DEVELOPER',
  isPrivate: false,
  userCr: { uid: memberUid, userUid: 'member-user', crName: 'member' }
};
const request = { headers: {}, body: { ns_uid: workspaceUid, targetUserCrUid: memberUid } };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.verify.mockResolvedValue({ userCrUid: ownerUid });
  mocks.prisma.userWorkspace.findMany.mockResolvedValue([owner, member]);
  mocks.prisma.userWorkspace.findFirst.mockResolvedValue(owner);
  mocks.globalPrisma.workspaceUsage.findUnique.mockResolvedValue(null);
  mocks.globalPrisma.$transaction.mockImplementation(async (fn) => fn(mocks.globalPrisma));
  mocks.modify.mockResolvedValue(true);
  mocks.unbind.mockResolvedValue(true);
});

it('does not change active private members while the owner registration is missing', async () => {
  const res: any = {};
  await handler(request as any, res);
  expect(res.body.code).toBe(409);
  expect(mocks.modify).not.toHaveBeenCalled();
  expect(mocks.unbind).not.toHaveBeenCalled();
  expect(mocks.globalPrisma.workspaceUsage.update).not.toHaveBeenCalled();
});

it('allows retry after login restores the registration, decrementing the seat once', async () => {
  const res: any = {};
  await handler(request as any, res);
  mocks.globalPrisma.workspaceUsage.findUnique.mockResolvedValue({
    userUid: 'owner-user',
    seat: 2
  });
  await handler(request as any, res);
  expect(res.body.code).toBe(200);
  expect(mocks.modify).toHaveBeenCalledOnce();
  expect(mocks.unbind).toHaveBeenCalledOnce();
  expect(mocks.globalPrisma.workspaceUsage.update).toHaveBeenCalledWith(
    expect.objectContaining({ data: { seat: 1 } })
  );
});

it('does not block canceling an invitation that has no active seat', async () => {
  mocks.prisma.userWorkspace.findMany.mockResolvedValue([owner, { ...member, status: 'INVITED' }]);
  const res: any = {};
  await handler(request as any, res);
  expect(res.body.code).toBe(200);
  expect(mocks.unbind).toHaveBeenCalledOnce();
  expect(mocks.globalPrisma.workspaceUsage.findUnique).not.toHaveBeenCalled();
});
