const state = vi.hoisted(() => ({
  globalDb: { user: { findUnique: vi.fn() } },
  regionDb: { userWorkspace: { findFirst: vi.fn() } },
  verify: vi.fn(),
  getKubeconfig: vi.fn(),
  switchNamespace: vi.fn(),
  userK8s: vi.fn(),
  api: {
    addInterceptor: vi.fn(),
    readNamespacedDeployment: vi.fn(),
    readNamespacedStatefulSet: vi.fn(),
    getNamespacedCustomObject: vi.fn()
  },
  service: { register: vi.fn(), complete: vi.fn() },
  http: vi.fn()
}));
vi.mock('@kubernetes/client-node', () => ({ AppsV1Api: class {}, CustomObjectsApi: class {} }));
vi.mock('@/services/backend/db/init', () => ({
  globalPrisma: state.globalDb,
  prisma: state.regionDb
}));
vi.mock('@/services/backend/auth', () => ({ verifyOAuth2AccessToken: state.verify }));
vi.mock('@/services/backend/kubernetes/admin', () => ({
  getUserKubeconfigNotPatch: state.getKubeconfig
}));
vi.mock('@/services/backend/kubernetes/user', () => ({ K8sApi: state.userK8s }));
vi.mock('@/utils/switchKubeconfigNamespace', () => ({
  switchKubeconfigNamespace: state.switchNamespace
}));
vi.mock('@/services/backend/acquisition/deployment-operations/service', () => ({
  nativeDeploymentService: state.service
}));
vi.mock('@/services/backend/acquisition/http', () => ({ acquisitionHttp: state.http }));
import {
  nativeDeploymentActor,
  workspaceResourceReader
} from '@/services/backend/acquisition/deployment-operations/kubernetes';
import begin from '@/pages/api/analytics/deployment-operations';
import complete from '@/pages/api/analytics/deployment-operations/[operation_id]/complete';

const UID = 'f52e329e-43c7-442f-a556-fd17f870042e';
const REGION = 'd87c36d8-3f12-4f14-a470-31201d12fbaa';
const ID = 'a69cb18c-e42b-456b-bb57-20ef42bce8a4';
const ACTOR = {
  userUid: UID,
  realm: 'global' as const,
  regionUid: REGION,
  regionDomain: 'usw-1.sealos.io'
};
function response() {
  const res: any = { code: 200, body: null, headers: {} };
  res.status = (code: number) => {
    res.code = code;
    return res;
  };
  res.json = (body: unknown) => {
    res.body = body;
    return res;
  };
  res.setHeader = (name: string, value: unknown) => {
    res.headers[name] = value;
    return res;
  };
  return res;
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('ACQUISITION_REALM', 'global');
  vi.stubEnv('ACQUISITION_NATIVE_CLIENT_IDS', 'sealos-io');
  global.AppConfig = { cloud: { regionUID: REGION, domain: ACTOR.regionDomain } } as any;
  state.verify.mockResolvedValue({ sub: UID, user_id: 'signed-account', client_id: 'sealos-io' });
  state.globalDb.user.findUnique.mockResolvedValue({ status: 'NORMAL_USER' });
  state.regionDb.userWorkspace.findFirst.mockResolvedValue({
    userCr: { crName: 'server-user-cr' }
  });
  state.getKubeconfig.mockResolvedValue('server-owned-kubeconfig');
  state.switchNamespace.mockReturnValue('server-owned-namespace-config');
  state.userK8s.mockReturnValue({ makeApiClient: () => state.api });
  state.api.readNamespacedDeployment.mockResolvedValue({ body: { metadata: { uid: 'proof' } } });
  state.service.register.mockResolvedValue({
    operation_id: ID,
    operation_marker: 'server-marker',
    expires_at: '2026-10-29T03:00:00Z'
  });
  state.service.complete.mockResolvedValue({ operation_id: ID, status: 'pending' });
});
afterEach(() => vi.unstubAllEnvs());

it('checks Native OAuth client identity and rejects browser-origin or invalid credentials', async () => {
  await expect(
    nativeDeploymentActor({
      headers: { origin: 'https://untrusted.test', authorization: 'Bearer valid' }
    } as any)
  ).rejects.toMatchObject({ status: 403 });
  expect(state.verify).not.toHaveBeenCalled();
  state.verify.mockResolvedValue(null);
  await expect(nativeDeploymentActor({ headers: {} } as any)).rejects.toMatchObject({
    status: 401
  });
  state.verify.mockResolvedValue({ sub: UID, client_id: 'other-client' });
  await expect(
    nativeDeploymentActor({ headers: { authorization: 'Bearer signed' } } as any)
  ).rejects.toMatchObject({ status: 401 });
});

it('binds the actor to the configured resource-region authority', async () => {
  expect(
    await nativeDeploymentActor({ headers: { authorization: 'Bearer native-token' } } as any)
  ).toEqual(ACTOR);
  expect(state.verify).toHaveBeenCalledWith('native-token');
  await expect(
    workspaceResourceReader({ ...ACTOR, regionUid: 'other-region' }, 'ns-test')
  ).rejects.toMatchObject({ status: 403 });
  expect(state.getKubeconfig).not.toHaveBeenCalled();
});

it('requires a still-active global account before looking at regional membership or credentials', async () => {
  state.globalDb.user.findUnique.mockResolvedValue({ status: 'MERGED_USER' });
  await expect(workspaceResourceReader(ACTOR, 'ns-test')).rejects.toMatchObject({ status: 403 });
  expect(state.regionDb.userWorkspace.findFirst).not.toHaveBeenCalled();
  expect(state.getKubeconfig).not.toHaveBeenCalled();
});

it('requires current Workspace membership and never loads a kubeconfig for a nonmember', async () => {
  state.regionDb.userWorkspace.findFirst.mockResolvedValue(null);
  await expect(workspaceResourceReader(ACTOR, 'ns-other')).rejects.toMatchObject({ status: 403 });
  expect(state.regionDb.userWorkspace.findFirst).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { status: 'IN_WORKSPACE', workspace: { id: 'ns-other' }, userCr: { userUid: UID } }
    })
  );
  expect(state.getKubeconfig).not.toHaveBeenCalled();
});

it('reads through only server-owned user credentials and enforces namespace and actual transport deadlines', async () => {
  const reader = await workspaceResourceReader(ACTOR, 'ns-test');
  expect(state.getKubeconfig).toHaveBeenCalledWith('server-user-cr', 2500);
  expect(state.switchNamespace).toHaveBeenCalledWith('server-owned-kubeconfig', 'ns-test');
  expect(state.userK8s).toHaveBeenCalledWith('server-owned-namespace-config');
  const requestOptions: any = {};
  state.api.addInterceptor.mock.calls[0][0](requestOptions);
  expect(requestOptions.timeout).toBe(2500);
  await reader({ api_version: 'apps/v1', kind: 'Deployment', name: 'demo', namespace: 'ns-test' });
  expect(state.api.readNamespacedDeployment).toHaveBeenCalledWith('demo', 'ns-test');
  await expect(
    reader({ api_version: 'apps/v1', kind: 'Deployment', name: 'demo', namespace: 'ns-other' })
  ).rejects.toMatchObject({ status: 403 });
});

it('distinguishes a missing resource from a forbidden or unavailable read', async () => {
  const reader = await workspaceResourceReader(ACTOR, 'ns-test');
  const ref = {
    api_version: 'apps/v1',
    kind: 'Deployment' as const,
    name: 'demo',
    namespace: 'ns-test'
  };
  state.api.readNamespacedDeployment.mockRejectedValue({ response: { statusCode: 404 } });
  expect(await reader(ref)).toBeNull();
  state.api.readNamespacedDeployment.mockRejectedValue({ response: { statusCode: 403 } });
  await expect(reader(ref)).rejects.toMatchObject({ status: 503 });
});

it('returns the raw registration capability without account credentials and accepts no client success boolean', async () => {
  const res = response();
  const body = { version: 1, operation_id: ID, workspace_id: 'ns-test', resources: [] };
  await begin({ method: 'POST', headers: { authorization: 'Bearer native' }, body } as any, res);
  expect(res.code).toBe(201);
  expect(res.body).toEqual({
    operation_id: ID,
    operation_marker: 'server-marker',
    expires_at: '2026-10-29T03:00:00Z'
  });
  expect(state.service.register).toHaveBeenCalledWith(ACTOR, body);
  expect(res.headers['Cache-Control']).toBe('no-store');
  const claimedSuccess = response();
  await complete(
    {
      method: 'POST',
      headers: { authorization: 'Bearer native' },
      query: { operation_id: ID },
      body: { success: true }
    } as any,
    claimedSuccess
  );
  expect(claimedSuccess.code).toBe(400);
  expect(state.service.complete).not.toHaveBeenCalled();
});

it('answers bounded pending status and uses only authenticated identity for completion', async () => {
  const res = response();
  await complete(
    {
      method: 'POST',
      headers: { authorization: 'Bearer native' },
      query: { operation_id: ID },
      body: { version: 1 }
    } as any,
    res
  );
  expect(res.code).toBe(202);
  expect(res.body).toEqual({ operation_id: ID, status: 'pending' });
  expect(state.service.complete).toHaveBeenCalledWith(ACTOR, ID);
});
