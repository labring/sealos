import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  globalPrisma: {
    region: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    userInfo: { updateMany: vi.fn() },
    workspaceUsage: {
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn()
    },
    mergeUserTransactionInfo: { findFirst: vi.fn(), findUnique: vi.fn() },
    $transaction: vi.fn()
  },
  prisma: {
    userCr: { findUnique: vi.fn() },
    userWorkspace: { create: vi.fn() },
    $transaction: vi.fn()
  },
  kubeconfig: vi.fn(),
  regionalToken: vi.fn(),
  appToken: vi.fn(),
  uuid: vi.fn()
}));

vi.mock('@/services/backend/db/init', () => mocks);
vi.mock('@/services/backend/kubernetes/admin', () => ({ getUserKubeconfig: mocks.kubeconfig }));
vi.mock('@/services/backend/kubernetes/user', () => ({
  GetUserDefaultNameSpace: (name: string) => `ns-${name}`
}));
vi.mock('@/services/enable', () => ({ getRegionUid: () => 'current-region' }));
vi.mock('@/services/backend/auth', () => ({
  generateRegionalToken: mocks.regionalToken,
  generateAppToken: mocks.appToken
}));
vi.mock('uuid', () => ({ v4: mocks.uuid }));
vi.mock('nanoid', () => ({ customAlphabet: () => () => 'new-user' }));

import { getRegionToken, initRegionToken } from '@/services/backend/regionAuth';

type Usage = {
  userUid: string;
  regionUid: string;
  workspaceUid: string;
  seat: number;
  id?: string;
  createdAt?: Date;
};
const login = { userUid: 'existing-user', userId: 'sealos-user' };
const usage = (workspaceUid: string, seat = 1, regionUid = 'current-region'): Usage => ({
  userUid: login.userUid,
  regionUid,
  workspaceUid,
  seat
});
const relation = (uid: string, isPrivate = false) => ({
  workspaceUid: uid,
  isPrivate,
  role: 'OWNER',
  status: 'IN_WORKSPACE',
  workspace: {
    uid,
    id: `ns-${uid}`,
    userWorkspace: [{ status: 'IN_WORKSPACE' }]
  }
});
const makeUser = (relations = [relation('private', true)]) => ({
  uid: 'regional-user',
  userUid: login.userUid,
  crName: 'existing-cr',
  userWorkspace: relations
});

describe('getRegionToken workspace registration recovery', () => {
  let usages: Usage[];
  let regionalUser: ReturnType<typeof makeUser> | null;
  let userInfo: { isInited: boolean } | null;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    usages = [];
    regionalUser = makeUser();
    userInfo = { isInited: true };
    mocks.globalPrisma.region.findUnique.mockResolvedValue({ uid: 'current-region' });
    mocks.globalPrisma.user.findUnique.mockImplementation(async () => ({
      userInfo,
      WorkspaceUsage: structuredClone(usages.filter((u) => u.userUid === login.userUid))
    }));
    mocks.prisma.userCr.findUnique.mockImplementation(async () => regionalUser);
    mocks.globalPrisma.workspaceUsage.findMany.mockImplementation(async ({ where }) =>
      usages.filter(
        (u) =>
          (!where.userUid || u.userUid === where.userUid) &&
          (!where.regionUid || u.regionUid === where.regionUid) &&
          (!where.workspaceUid || where.workspaceUid.in.includes(u.workspaceUid))
      )
    );
    mocks.globalPrisma.workspaceUsage.create.mockImplementation(async ({ data }) => {
      usages.push(data);
      return data;
    });
    mocks.globalPrisma.workspaceUsage.createMany.mockImplementation(
      async ({ data, skipDuplicates }) => {
        let count = 0;
        for (const row of data as Usage[]) {
          const exists = usages.some(
            (u) =>
              u.userUid === row.userUid &&
              u.regionUid === row.regionUid &&
              u.workspaceUid === row.workspaceUid
          );
          if (exists) {
            if (skipDuplicates) continue;
            throw Object.assign(new Error('duplicate usage'), { code: 'P2002' });
          }
          usages.push(row);
          count++;
        }
        return { count };
      }
    );
    mocks.globalPrisma.workspaceUsage.delete.mockImplementation(async ({ where }) => {
      if (where.id) {
        usages = usages.filter((u) => u.id !== where.id);
        return;
      }
      const key = where.regionUid_userUid_workspaceUid;
      usages = usages.filter(
        (u) =>
          u.userUid !== key.userUid ||
          u.regionUid !== key.regionUid ||
          u.workspaceUid !== key.workspaceUid
      );
    });
    mocks.globalPrisma.mergeUserTransactionInfo.findFirst.mockResolvedValue(null);
    mocks.globalPrisma.mergeUserTransactionInfo.findUnique.mockResolvedValue(null);
    mocks.globalPrisma.userInfo.updateMany.mockImplementation(async () => {
      if (userInfo) userInfo.isInited = true;
      return { count: 1 };
    });
    mocks.globalPrisma.$transaction.mockImplementation(async (fn) => fn(mocks.globalPrisma));
    mocks.prisma.$transaction.mockImplementation(async (fn) => fn(mocks.prisma));
    mocks.prisma.userWorkspace.create.mockImplementation(async ({ data }) => {
      const workspace = data.workspace.create;
      regionalUser = makeUser([relation(workspace.uid, true)]);
      regionalUser.crName = data.userCr.create.crName;
      return { userCr: regionalUser, workspace };
    });
    mocks.kubeconfig.mockResolvedValue('test-kubeconfig');
    mocks.regionalToken.mockReturnValue('regional-token');
    mocks.appToken.mockReturnValue('app-token');
    mocks.uuid.mockReturnValue('new-workspace');
  });

  it('recovers only the private registration without touching team or other-region registrations', async () => {
    const team = relation('team');
    team.workspace.userWorkspace.push({ status: 'IN_WORKSPACE' }, { status: 'INVITED' });
    regionalUser = makeUser([relation('private', true), team]);
    const otherRegion = usage('other-space', 4, 'other-region');
    usages = [otherRegion];

    await expect(getRegionToken(login)).resolves.toEqual({
      token: 'regional-token',
      appToken: 'app-token',
      kubeconfig: 'test-kubeconfig'
    });
    expect(usages).toEqual(expect.arrayContaining([otherRegion, usage('private')]));
    expect(usages).toHaveLength(2);
    expect(mocks.regionalToken).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceUid: 'private', workspaceId: 'ns-private' })
    );
    expect(mocks.uuid).not.toHaveBeenCalled();
    expect(mocks.prisma.userWorkspace.create).not.toHaveBeenCalled();
  });

  it('does not recreate a missing team during login', async () => {
    regionalUser = makeUser([relation('private', true), relation('team')]);
    usages = [usage('private', 7)];
    await getRegionToken(login);
    expect(usages).toEqual([usage('private', 7)]);
  });

  it('repairs a missing private registration when a team is already registered', async () => {
    regionalUser = makeUser([relation('private', true), relation('team')]);
    usages = [usage('team', 5)];
    await getRegionToken(login);
    expect(usages).toEqual([usage('team', 5), usage('private')]);
  });

  it('also recovers legacy users without user_info', async () => {
    userInfo = null;
    await getRegionToken(login);
    expect(usages).toEqual([usage('private')]);
    expect(mocks.uuid).not.toHaveBeenCalled();
  });

  it('keeps repeated and concurrent logins idempotent', async () => {
    regionalUser = makeUser([relation('private', true), relation('team')]);
    const results = await Promise.all([getRegionToken(login), getRegionToken(login)]);
    results.push(await getRegionToken(login));
    expect(results.every((r) => r?.token === 'regional-token')).toBe(true);
    expect(usages).toEqual([usage('private')]);
    expect(mocks.uuid).not.toHaveBeenCalled();
  });

  it('only registers active OWNER relationships', async () => {
    const developer = { ...relation('developer'), role: 'DEVELOPER' };
    const invited = { ...relation('invited'), status: 'INVITED' };
    const departed = { ...relation('departed'), status: 'NOT_IN_WORKSPACE' };
    regionalUser = makeUser([relation('private', true), developer, invited, departed]);
    await getRegionToken(login);
    expect(usages).toEqual([usage('private')]);
  });

  it.each(['missing', 'multiple', 'inactive', 'non-owner'])(
    'rejects %s private ownership before writing registrations or issuing tokens',
    async (condition) => {
      const privateRelation = relation('private', true);
      if (condition === 'inactive') privateRelation.status = 'NOT_IN_WORKSPACE';
      if (condition === 'non-owner') privateRelation.role = 'DEVELOPER';
      regionalUser = makeUser(
        condition === 'missing'
          ? [relation('team')]
          : condition === 'multiple'
          ? [privateRelation, relation('second-private', true)]
          : [privateRelation]
      );
      await expect(getRegionToken(login)).rejects.toThrow();
      expect(usages).toEqual([]);
      expect(mocks.uuid).not.toHaveBeenCalled();
      expect(mocks.kubeconfig).not.toHaveBeenCalled();
      expect(mocks.regionalToken).not.toHaveBeenCalled();
    }
  );

  it('keeps normal registrations unchanged', async () => {
    usages = [usage('private', 6)];
    await getRegionToken(login);
    expect(usages).toEqual([usage('private', 6)]);
    expect(mocks.globalPrisma.workspaceUsage.createMany).not.toHaveBeenCalled();
  });

  it('preserves the initialization gate', async () => {
    userInfo = { isInited: false };
    regionalUser = null;
    await expect(getRegionToken(login)).resolves.toBeNull();
    expect(usages).toEqual([]);
    expect(mocks.kubeconfig).not.toHaveBeenCalled();
  });

  it('returns null for an unknown global user', async () => {
    mocks.globalPrisma.user.findUnique.mockResolvedValue(null);
    await expect(getRegionToken(login)).resolves.toBeNull();
    expect(usages).toEqual([]);
  });

  it('still creates a private workspace on first entry into a new region', async () => {
    regionalUser = null;
    await getRegionToken(login);
    expect(usages).toEqual([usage('new-workspace')]);
    expect(mocks.prisma.userWorkspace.create).toHaveBeenCalledOnce();
    expect(mocks.regionalToken).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceUid: 'new-workspace', userCrName: 'new-user' })
    );
  });

  it('resumes a single registration left by incomplete regional creation', async () => {
    regionalUser = null;
    usages = [usage('in-progress')];
    await getRegionToken(login);
    expect(usages).toEqual([usage('in-progress')]);
    expect(mocks.prisma.userWorkspace.create).toHaveBeenCalledOnce();
    expect(mocks.regionalToken).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceUid: 'in-progress' })
    );
    expect(mocks.globalPrisma.workspaceUsage.create).not.toHaveBeenCalled();
    expect(mocks.uuid).not.toHaveBeenCalled();
  });

  it('resumes its own reservation after a transient regional transaction failure', async () => {
    regionalUser = null;
    mocks.prisma.$transaction.mockRejectedValueOnce(new Error('temporary regional failure'));
    await getRegionToken(login);
    expect(usages).toEqual([usage('new-workspace')]);
    expect(mocks.globalPrisma.workspaceUsage.create).toHaveBeenCalledOnce();
    expect(mocks.uuid).toHaveBeenCalledOnce();
    expect(mocks.regionalToken).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceUid: 'new-workspace' })
    );
  });

  it('rejects ambiguous registrations without a regional user', async () => {
    regionalUser = null;
    usages = [usage('first'), usage('second')];
    await expect(getRegionToken(login)).rejects.toThrow('Ambiguous workspace registrations');
    expect(usages).toEqual([usage('first'), usage('second')]);
    expect(mocks.prisma.userWorkspace.create).not.toHaveBeenCalled();
    expect(mocks.uuid).not.toHaveBeenCalled();
  });

  it('does not restore a former owner registration during a workspace transfer', async () => {
    regionalUser = makeUser([relation('private', true), relation('team')]);
    const newOwnerUsage = { ...usage('team', 2), userUid: 'new-owner' };
    usages = [usage('private'), newOwnerUsage];
    await expect(getRegionToken(login)).resolves.toHaveProperty('token', 'regional-token');
    expect(usages).toEqual([usage('private'), newOwnerUsage]);
    expect(mocks.globalPrisma.workspaceUsage.createMany).not.toHaveBeenCalled();
  });

  it('rejects a private workspace registered to another user', async () => {
    const otherOwnerUsage = { ...usage('private'), userUid: 'other-owner' };
    usages = [otherOwnerUsage];
    await expect(getRegionToken(login)).rejects.toThrow(
      'Private workspace is registered to another user'
    );
    expect(usages).toEqual([otherOwnerUsage]);
    expect(mocks.kubeconfig).not.toHaveBeenCalled();
    expect(mocks.regionalToken).not.toHaveBeenCalled();
  });

  it('preserves recovery when a recorded merge left private usage on the old account', async () => {
    const oldOwnerUsage = { ...usage('private'), userUid: 'former-owner' };
    usages = [oldOwnerUsage];
    mocks.globalPrisma.mergeUserTransactionInfo.findUnique.mockResolvedValue({
      userUid: login.userUid,
      mergeUserUid: 'former-owner'
    });
    await expect(getRegionToken(login)).resolves.toHaveProperty('token', 'regional-token');
    expect(usages).toEqual([oldOwnerUsage, usage('private')]);
    expect(mocks.globalPrisma.mergeUserTransactionInfo.findUnique).toHaveBeenCalledWith({
      where: { mergeUserUid: 'former-owner' },
      select: { userUid: true }
    });
    expect(mocks.uuid).not.toHaveBeenCalled();
  });

  it('retries a serializable recovery conflict without creating another workspace', async () => {
    mocks.globalPrisma.$transaction.mockRejectedValueOnce(
      Object.assign(new Error('write conflict'), { code: 'P2034' })
    );
    await getRegionToken(login);
    expect(usages).toEqual([usage('private')]);
    expect(mocks.uuid).not.toHaveBeenCalled();
  });

  it('does not issue tokens when the global registration write fails', async () => {
    mocks.globalPrisma.workspaceUsage.createMany.mockRejectedValue(
      new Error('global db unavailable')
    );
    await expect(getRegionToken(login)).rejects.toThrow('global db unavailable');
    expect(mocks.globalPrisma.workspaceUsage.createMany).toHaveBeenCalledTimes(3);
    expect(usages).toEqual([]);
    expect(mocks.kubeconfig).not.toHaveBeenCalled();
    expect(mocks.regionalToken).not.toHaveBeenCalled();
  });

  it('does not write registrations when the regional read fails', async () => {
    mocks.prisma.userCr.findUnique.mockRejectedValue(new Error('regional db unavailable'));
    await expect(getRegionToken(login)).rejects.toThrow('regional db unavailable');
    expect(usages).toEqual([]);
    expect(mocks.regionalToken).not.toHaveBeenCalled();
  });

  it('retains recovered registrations across a temporary kubeconfig failure', async () => {
    mocks.kubeconfig.mockResolvedValueOnce(null).mockResolvedValue('test-kubeconfig');
    await expect(getRegionToken(login)).resolves.toHaveProperty('token', 'regional-token');
    expect(usages).toEqual([usage('private')]);
    expect(mocks.globalPrisma.workspaceUsage.delete).not.toHaveBeenCalled();
  });
  it('recovers a private workspace across a proven A to B to C merge chain', async () => {
    const old = { ...usage('private'), userUid: 'owner-A' };
    usages = [old];
    mocks.globalPrisma.mergeUserTransactionInfo.findUnique.mockImplementation(async ({ where }) =>
      where.mergeUserUid === 'owner-A'
        ? { userUid: 'owner-B' }
        : where.mergeUserUid === 'owner-B'
        ? { userUid: login.userUid }
        : null
    );
    await expect(getRegionToken(login)).resolves.toHaveProperty('token');
    expect(usages).toEqual([old, usage('private')]);
    expect(mocks.uuid).not.toHaveBeenCalled();
  });

  it('rejects cyclic or unrelated merge history without issuing credentials', async () => {
    usages = [{ ...usage('private'), userUid: 'owner-A' }];
    mocks.globalPrisma.mergeUserTransactionInfo.findUnique.mockImplementation(
      async ({ where }) => ({ userUid: where.mergeUserUid === 'owner-A' ? 'owner-B' : 'owner-A' })
    );
    await expect(getRegionToken(login)).rejects.toThrow(
      'Private workspace is registered to another user'
    );
    expect(usages).toHaveLength(1);
    expect(mocks.kubeconfig).not.toHaveBeenCalled();
  });

  it('does not resurrect a team deleted after the regional login snapshot was read', async () => {
    regionalUser = makeUser([relation('private', true), relation('team')]);
    usages = [usage('private')];
    mocks.prisma.userCr.findUnique.mockImplementationOnce(async () => {
      const snapshot = structuredClone(regionalUser);
      regionalUser = makeUser([relation('private', true)]);
      return snapshot;
    });
    await expect(getRegionToken(login)).resolves.toHaveProperty('token');
    expect(usages).toEqual([usage('private')]);
    expect(mocks.globalPrisma.workspaceUsage.createMany).not.toHaveBeenCalled();
  });

  const initialize = () =>
    initRegionToken({ ...login, regionUid: 'current-region', workspaceName: 'chosen name' });

  it.each(['normal', 'init'])(
    'recovers false initialization through %s without deleting real registrations',
    async (entry) => {
      userInfo = { isInited: false };
      regionalUser = makeUser([relation('private', true), relation('team')]);
      regionalUser.userWorkspace[0].workspace.userWorkspace.push({ status: 'IN_WORKSPACE' });
      const real = {
        ...usage('other-private', 4, 'other-region'),
        id: 'old-real',
        createdAt: new Date(0)
      };
      const wrong = usage('wrong-random-workspace');
      usages = [real, wrong, usage('team', 5)];
      await expect(entry === 'init' ? initialize() : getRegionToken(login)).resolves.toHaveProperty(
        'token'
      );
      expect(usages).toEqual([real, wrong, usage('team', 5), usage('private', 2)]);
      expect(userInfo.isInited).toBe(true);
      expect(mocks.globalPrisma.workspaceUsage.delete).not.toHaveBeenCalled();
      expect(mocks.prisma.userWorkspace.create).not.toHaveBeenCalled();
      expect(mocks.uuid).not.toHaveBeenCalled();
      expect(mocks.globalPrisma.userInfo.updateMany.mock.invocationCallOrder[0]).toBeGreaterThan(
        mocks.kubeconfig.mock.invocationCallOrder[0]
      );
    }
  );

  it('leaves an old other-region reservation untouched when no local private workspace exists', async () => {
    userInfo = { isInited: false };
    regionalUser = null;
    const old = {
      ...usage('other-private', 1, 'other-region'),
      id: 'old-real',
      createdAt: new Date(0)
    };
    usages = [old];
    await expect(initialize()).resolves.toBeNull();
    expect(usages).toEqual([old]);
    expect(mocks.globalPrisma.workspaceUsage.delete).not.toHaveBeenCalled();
    expect(mocks.prisma.userWorkspace.create).not.toHaveBeenCalled();
    expect(userInfo.isInited).toBe(false);
  });

  it('initializes a genuine new user and safely repeats a completed initialization', async () => {
    userInfo = { isInited: false };
    regionalUser = null;
    await expect(initialize()).resolves.toHaveProperty('token');
    expect(mocks.prisma.userWorkspace.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workspace: { create: expect.objectContaining({ displayName: 'chosen name' }) }
        })
      })
    );
    await expect(initialize()).resolves.toHaveProperty('token');
    expect(usages).toEqual([usage('new-workspace')]);
    expect(mocks.prisma.userWorkspace.create).toHaveBeenCalledOnce();
    expect(userInfo.isInited).toBe(true);
  });

  it('resumes a local initialization reservation without choosing a team or another region', async () => {
    userInfo = { isInited: false };
    regionalUser = null;
    usages = [usage('reserved-private')];
    await initialize();
    expect(usages).toEqual([usage('reserved-private')]);
    expect(mocks.uuid).not.toHaveBeenCalled();
    expect(mocks.regionalToken).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceUid: 'reserved-private' })
    );
  });

  it('retains false state and existing registrations across kubeconfig failure, then recovers', async () => {
    userInfo = { isInited: false };
    usages = [usage('private', 4)];
    mocks.kubeconfig.mockResolvedValue(null);
    await expect(initialize()).rejects.toThrow('Failed to get user from k8s');
    expect(userInfo.isInited).toBe(false);
    expect(mocks.globalPrisma.userInfo.updateMany).not.toHaveBeenCalled();
    expect(usages).toEqual([usage('private', 4)]);
    mocks.kubeconfig.mockResolvedValue('test-kubeconfig');
    await initialize();
    expect(userInfo.isInited).toBe(true);
    expect(usages).toEqual([usage('private', 4)]);
  });
});
