import * as k8s from '@kubernetes/client-node';
import { _passwordLoginRequest } from '@/api/auth';
import { _setAuth, cleanDb, cleanK8s } from '@/__tests__/api/tools';
import { _createRequest, _deleteTeamRequest, _switchRequest } from '@/api/namespace';
import request from '@/__tests__/api/request';
import { AccessTokenPayload } from '@/types/token';
import { prisma } from '@/services/backend/db/init';
import { jwtDecode } from 'jwt-decode';
import { v4 } from 'uuid';
describe('delete team', () => {
  const deleteTeamRequest = _deleteTeamRequest(request);
  const createRequest = _createRequest(request);
  const switchRequest = _switchRequest(request);
  let token1: string;
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
    console.log('payload1', payload1);
    setAuth(token1);
  }, 100000);
  it('null team', async () => {
    const res = await deleteTeamRequest({ ns_uid: '' });
    // 没参数
    expect(res.code).toBe(400);
    /** @ts-ignore **/
    const res2 = await deleteTeamRequest({ ns_uid: undefined });
    // 没参数
    expect(res2.code).toBe(400);
    /** @ts-ignore **/
    const res3 = await deleteTeamRequest({ ns_uid: null });
    // 没参数
    expect(res3.code).toBe(400);
    // 参数有问题
    const res4 = await deleteTeamRequest({ ns_uid: 'asdfsadf' });
    // 没参数
    expect(res4.code).toBe(400);
  });
  it('delete prviate team vaild', async () => {
    const res = await deleteTeamRequest({ ns_uid: payload1.workspaceUid });
    expect(res.code).toBe(403);
  });
  it('delete unkown team', async () => {
    const res = await deleteTeamRequest({ ns_uid: v4() });
    expect(res.code).toBe(404);
  });
  it('already exist team', async () => {
    const ns = await createRequest({ teamName: 'testTeam' });
    expect(ns.data).toBeDefined();
    const res = await deleteTeamRequest({ ns_uid: ns.data!.namespace.uid });
    expect(res.code).toBe(200);
  }, 10000);
  it('delete current team', async () => {
    setAuth(token1);
    const ns = await createRequest({ teamName: 'testssTeam' });
    expect(ns.data).toBeDefined();
    const ns_uid = ns.data!.namespace.uid;
    const res = await switchRequest(ns_uid);
    expect(res.code).toBe(200);
    expect(res.data).toBeDefined();
    setAuth(res.data!.token);
    const res2 = await deleteTeamRequest({ ns_uid });
    expect(res2.code).toBe(403);
  });
});
