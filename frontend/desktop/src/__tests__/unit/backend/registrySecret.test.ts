/** @jest-environment node */
import axios from 'axios';
import { ensureWorkspaceRegistrySecret } from '@/services/backend/registrySecret';

const mockGetApp = jest.fn();
const mockGetKubeconfig = jest.fn();
const mockVerify = jest.fn();
const mockPrisma: any = {
  userCr: { findUnique: jest.fn() },
  userWorkspace: { findMany: jest.fn(), create: jest.fn() },
  workspace: { create: jest.fn() },
  $transaction: jest.fn()
};
const mockGlobalPrisma: any = {
  region: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  userInfo: { update: jest.fn() },
  workspaceUsage: { create: jest.fn(), delete: jest.fn() },
  $transaction: jest.fn()
};
jest.mock('axios');
jest.mock('@kubernetes/client-node', () => ({ CustomObjectsApi: class {} }));
jest.mock('@/services/backend/auth', () => ({
  generateAppToken: (payload: unknown) => JSON.stringify(payload),
  generateRegionalToken: () => 'regional-token',
  verifyAccessToken: () => mockVerify()
}));
jest.mock('@/services/backend/kubernetes/admin', () => ({
  K8sApiDefault: () => ({ makeApiClient: () => ({ getNamespacedCustomObject: mockGetApp }) }),
  getUserKubeconfig: () => mockGetKubeconfig(),
  getTeamKubeconfig: () => mockGetKubeconfig(),
  getUserKubeconfigNotPatch: () => mockGetKubeconfig()
}));
jest.mock('@/services/backend/db/init', () => ({
  get prisma() {
    return mockPrisma;
  },
  get globalPrisma() {
    return mockGlobalPrisma;
  }
}));
jest.mock('@/services/backend/kubernetes/user', () => ({
  K8sApi: () => ({}),
  ListCRD: async () => ({ body: { items: [] } }),
  GetUserDefaultNameSpace: (name: string) => `ns-${name}`
}));
jest.mock('@/utils/switchKubeconfigNamespace', () => ({
  switchKubeconfigNamespace: (kc: string) => kc
}));
jest.mock('@/services/enable', () => ({ getRegionUid: () => 'region' }));
jest.mock('@/services/backend/team', () => ({ modifyWorkspaceRole: jest.fn() }));
jest.mock('@/services/backend/middleware/error', () => ({
  isLicenseInactiveError: () => false,
  isLicenseUserLimitExceededError: () => false
}));
jest.mock('@/utils/tools', () => ({ retrySerially: (operation: () => unknown) => operation() }));
jest.mock('nanoid', () => ({ customAlphabet: () => () => 'team1234' }));
jest.mock(
  'prisma/region/generated/client',
  () => ({ JoinStatus: { IN_WORKSPACE: 'IN_WORKSPACE' }, Role: { OWNER: 'OWNER' } }),
  { virtual: true }
);

const payload = {
  userUid: 'user-uid',
  userId: 'user-id',
  userCrUid: 'cr-uid',
  userCrName: 'owner',
  regionUid: 'region',
  workspaceUid: 'a1d77366-7ab4-4685-b1a4-683a608ea198',
  workspaceId: 'ns-owner'
};
const post = axios.post as jest.Mock;
const tokenPayload = () => JSON.parse(post.mock.calls[0][2].headers['Authorization-Bearer']);
beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.SEALOS_REGISTRY_INTERNAL_URL;
  mockGetApp.mockResolvedValue({
    body: { spec: { data: { url: 'https://registry.example.test' } } }
  });
  mockGetKubeconfig.mockResolvedValue('kubeconfig');
  mockVerify.mockResolvedValue(payload);
  (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(false);
  post.mockImplementation(async (_url, _body, options) => ({
    data: {
      namespace: JSON.parse(options.headers['Authorization-Bearer']).workspaceId,
      secretName: 'sealos-registry-secret',
      created: true
    }
  }));
  jest.spyOn(console, 'error').mockImplementation();
  jest.spyOn(console, 'log').mockImplementation();
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('workspace registry initialization', () => {
  it('discovers the installed app and delegates initialization with the correct workspace token', async () => {
    await ensureWorkspaceRegistrySecret(payload);
    expect(mockGetApp).toHaveBeenCalledWith(
      'app.sealos.io',
      'v1',
      'app-system',
      'apps',
      'sealos-registry'
    );
    expect(post).toHaveBeenCalledWith(
      'http://sealos-registry.registry-system.svc.cluster.local/api/runtime/registry-secret',
      undefined,
      {
        headers: { 'Authorization-Bearer': expect.any(String) },
        timeout: 5000,
        maxRedirects: 0
      }
    );
    expect(tokenPayload()).toEqual(payload);
    expect(console.error).not.toHaveBeenCalled();
  });
  it('supports a custom management service without changing TLS verification', async () => {
    process.env.SEALOS_REGISTRY_INTERNAL_URL =
      'http://custom-registry.custom.svc.cluster.local:8080';
    await ensureWorkspaceRegistrySecret(payload);
    expect(post.mock.calls[0][0]).toBe(
      'http://custom-registry.custom.svc.cluster.local:8080/api/runtime/registry-secret'
    );
  });

  it('strips registered JWT claims before re-signing a verified workspace token', async () => {
    const verifiedPayload = { ...payload, exp: 1, iat: 0 };
    await ensureWorkspaceRegistrySecret(verifiedPayload);
    expect(tokenPayload()).toEqual(payload);
  });

  it('accepts an existing secret without requesting rotation', async () => {
    post.mockResolvedValue({
      data: { namespace: payload.workspaceId, secretName: 'sealos-registry-secret', created: false }
    });
    await ensureWorkspaceRegistrySecret(payload);
    expect(post).toHaveBeenCalledTimes(1);
    expect(console.error).not.toHaveBeenCalled();
  });
  it('skips installations without Registry', async () => {
    mockGetApp.mockRejectedValue({ statusCode: 404 });
    await ensureWorkspaceRegistrySecret(payload);
    expect(post).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });
  it.each([401, 403, 409, 500])(
    'keeps login available on HTTP %s and logs safe metadata',
    async (status) => {
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);
      post.mockRejectedValue({
        response: { status },
        config: { headers: { 'Authorization-Bearer': 'private-token' } }
      });
      await expect(ensureWorkspaceRegistrySecret(payload)).resolves.toBeUndefined();
      expect(console.error).toHaveBeenCalledWith('Failed to initialize workspace registry secret', {
        workspaceId: payload.workspaceId,
        status
      });
    }
  );
  it('bounds discovery when Kubernetes is unavailable', async () => {
    jest.useFakeTimers();
    mockGetApp.mockReturnValue(new Promise(() => {}));
    const result = ensureWorkspaceRegistrySecret(payload);
    await jest.advanceTimersByTimeAsync(5000);
    await expect(result).resolves.toBeUndefined();
    expect(post).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledTimes(1);
  });
  it('reports an unexpected response', async () => {
    post.mockResolvedValue({ data: { namespace: 'another-workspace' } });
    await ensureWorkspaceRegistrySecret(payload);
    expect(console.error).toHaveBeenCalledTimes(1);
  });
});

function configureLogin(isInited: boolean) {
  const relation = {
    isPrivate: true,
    role: 'OWNER',
    status: 'IN_WORKSPACE',
    workspaceUid: payload.workspaceUid,
    workspace: { uid: payload.workspaceUid, id: payload.workspaceId }
  };
  mockGlobalPrisma.region.findUnique.mockResolvedValue({ uid: 'region' });
  mockGlobalPrisma.user.findUnique.mockResolvedValue({
    userInfo: { isInited },
    WorkspaceUsage: [{ regionUid: 'region', workspaceUid: payload.workspaceUid }]
  });
  mockPrisma.userCr.findUnique.mockResolvedValue({
    uid: payload.userCrUid,
    crName: payload.userCrName,
    userUid: payload.userUid,
    userWorkspace: [relation]
  });
  mockPrisma.$transaction.mockImplementation((operation: (tx: unknown) => unknown) =>
    operation(mockPrisma)
  );
}
describe('initialization entry points', () => {
  it('initializes before the shared login flow returns its tokens', async () => {
    configureLogin(true);
    const { getRegionToken } = await import('@/services/backend/regionAuth');
    const result = await getRegionToken({ userUid: payload.userUid, userId: payload.userId });
    expect(result?.token).toBe('regional-token');
    expect(post).toHaveBeenCalledTimes(1);
    expect(tokenPayload()).toEqual(payload);
  });
  it('initializes the private workspace on first signup', async () => {
    configureLogin(false);
    const { initRegionToken } = await import('@/services/backend/regionAuth');
    const result = await initRegionToken({
      userUid: payload.userUid,
      userId: payload.userId,
      regionUid: 'region',
      workspaceName: ''
    });
    expect(result?.token).toBe('regional-token');
    expect(post).toHaveBeenCalledTimes(1);
  });
  it('does not create credentials for an unsuccessful login', async () => {
    configureLogin(true);
    mockGlobalPrisma.user.findUnique.mockResolvedValue(null);
    const { getRegionToken } = await import('@/services/backend/regionAuth');
    expect(await getRegionToken({ userUid: payload.userUid, userId: payload.userId })).toBeNull();
    expect(post).not.toHaveBeenCalled();
  });
  it('backfills desktop bootstrap for sessions issued by independent SSO flows', async () => {
    mockGlobalPrisma.user.findUnique.mockResolvedValue({ uid: payload.userUid });
    const { default: handler } = await import('@/pages/api/desktop/getInstalledApps');
    const res = { json: jest.fn() };
    await handler({ headers: {} } as any, res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 200 }));
    expect(post).toHaveBeenCalledTimes(1);
    expect(tokenPayload()).toEqual(payload);
  });

  it('initializes the selected team on workspace switch', async () => {
    mockPrisma.userWorkspace.findMany.mockResolvedValue([
      {
        workspaceUid: payload.workspaceUid,
        workspace: { id: 'ns-team', uid: payload.workspaceUid }
      }
    ]);
    const { default: handler } = await import('@/pages/api/auth/namespace/switch');
    const res = { json: jest.fn() };
    await handler({ headers: {}, body: { ns_uid: payload.workspaceUid } } as any, res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 200 }));
    expect(post).toHaveBeenCalledTimes(1);
    expect(tokenPayload().workspaceId).toBe('ns-team');
  });
  it('initializes a new team after the membership transaction commits', async () => {
    mockPrisma.userWorkspace.findMany.mockResolvedValue([]);
    mockPrisma.userCr.findUnique
      .mockResolvedValueOnce({ uid: payload.userCrUid })
      .mockResolvedValueOnce(null);
    mockGlobalPrisma.$transaction.mockResolvedValue('success');
    mockPrisma.$transaction.mockResolvedValue([
      { uid: 'new-team-uid', id: 'ns-team1234', displayName: 'Team' }
    ]);
    const { default: handler } = await import('@/pages/api/auth/namespace/create');
    const res = { json: jest.fn() };
    await handler({ headers: {}, body: { teamName: 'Team' } } as any, res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 200 }));
    expect(post).toHaveBeenCalledTimes(1);
    expect(tokenPayload()).toEqual(
      expect.objectContaining({ workspaceId: 'ns-team1234', workspaceUid: expect.any(String) })
    );
    expect(mockPrisma.$transaction.mock.invocationCallOrder[0]).toBeLessThan(
      post.mock.invocationCallOrder[0]
    );
  });
});
