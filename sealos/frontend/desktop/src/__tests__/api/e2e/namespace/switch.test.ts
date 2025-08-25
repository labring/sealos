import { _passwordLoginRequest } from '@/api/auth';
import { _createRequest, _switchRequest } from '@/api/namespace';
import { NamespaceDto } from '@/types/team';
import * as k8s from '@kubernetes/client-node';
import request from '@/__tests__/api/request';
import { _setAuth, cleanDb, cleanK8s } from '@/__tests__/api/tools';
import { AccessTokenPayload } from '@/types/token';
import { prisma } from '@/services/backend/db/init';
import { jwtDecode } from 'jwt-decode';

const createRequest = _createRequest(request);
const switchRequest = _switchRequest(request);
describe('switch ns', () => {
  let token1: string;
  let ns: NamespaceDto;
  let payload1: AccessTokenPayload;
  const setAuth = _setAuth(request);
  const passwordLoginRequest = _passwordLoginRequest(request, setAuth);
  beforeAll(async () => {
    //@ts-ignore
    // console.log('MONGODB_URI', uri)
    const kc = new k8s.KubeConfig();
    await cleanK8s(kc, prisma);
    await cleanDb(prisma);
    setAuth();
    const res = await passwordLoginRequest({ user: 'abdicatetesttest', password: 'testtest' });
    // 保证session合理
    expect(res!.data).toBeDefined();
    token1 = res!.data!.token;
    payload1 = jwtDecode<AccessTokenPayload>(token1);
    setAuth(token1);
    const nsRes = await createRequest({ teamName: 'teamZero' });
    expect(nsRes.data).toBeDefined();
    ns = nsRes.data!.namespace;
  }, 100000);
  afterAll(async () => {
    // await connection.close();
  });
  it('easy switch', async () => {
    const res1 = await switchRequest(ns.uid);
    expect(res1.code).toBe(200);
    const { workspaceUid, workspaceId, userId, userCrUid, userCrName, userUid } =
      jwtDecode<AccessTokenPayload>(res1.data!.token);
    expect<Omit<AccessTokenPayload, 'regionUid'>>({
      workspaceUid,
      workspaceId,
      userCrName,
      userCrUid,
      userUid,
      userId
    }).toMatchObject({
      workspaceUid: ns.uid,
      workspaceId: ns.id,
      userCrName: payload1.userCrName,
      userCrUid: payload1.userCrUid,
      userUid: payload1.userUid,
      userId: payload1.userId
    });
  });
});
