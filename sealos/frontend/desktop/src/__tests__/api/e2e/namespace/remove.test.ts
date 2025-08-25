import { _passwordLoginRequest } from '@/api/auth';
import {
  _abdicateRequest,
  _createRequest,
  _inviteMemberRequest,
  _removeMemberRequest,
  _verifyInviteRequest,
  reciveAction
} from '@/api/namespace';
import { NamespaceDto, UserRole } from '@/types/team';
import * as k8s from '@kubernetes/client-node';
import request from '@/__tests__/api/request';
import { _setAuth, cleanDb, cleanK8s } from '@/__tests__/api/tools';
import { AccessTokenPayload } from '@/types/token';
import { prisma } from '@/services/backend/db/init';
import { jwtDecode } from 'jwt-decode';
import { v4 } from 'uuid';
const abdicateRequest = _abdicateRequest(request);
const createRequest = _createRequest(request);
const inviteMemberRequest = _inviteMemberRequest(request);
const verifyInviteRequest = _verifyInviteRequest(request);
const removeMember = _removeMemberRequest(request);
describe('remove member', () => {
  let token1: string;
  let token2: string;
  let payload1: AccessTokenPayload;
  let payload2: AccessTokenPayload;
  let ns: NamespaceDto;
  const setAuth = _setAuth(request);
  const passwordLoginRequest = _passwordLoginRequest(request, setAuth);
  beforeAll(async () => {
    const kc = new k8s.KubeConfig();
    await cleanK8s(kc, prisma);
    await cleanDb(prisma);
    setAuth();
    const res = await passwordLoginRequest({ user: 'removetesttest', password: 'testtest' });
    // 保证session合理
    token1 = res!.data!.token;
    expect(token1).toBeDefined();
    payload1 = jwtDecode(token1);
    setAuth();
    const res2 = await passwordLoginRequest({ user: 'removetesttest2', password: 'testtest2' });
    // 保证session合理
    token2 = res2!.data!.token;
    expect(token2).toBeDefined();
    setAuth(token1);
    payload2 = jwtDecode(token2);
    const nsRes = await createRequest({ teamName: 'teamZero' });
    expect(nsRes.data?.namespace).toBeDefined();
    ns = nsRes.data?.namespace!;
  }, 100000);
  it('null param', async () => {
    const res = await removeMember({ ns_uid: '', targetUserCrUid: v4() });
    // 没参数
    expect(res.code).toBe(400);
    const res2 = await removeMember({ ns_uid: v4(), targetUserCrUid: '' });
    // 非uuid
    expect(res2.code).toBe(400);
    const res3 = await removeMember({ ns_uid: v4(), targetUserCrUid: 'xxx' });
    // 没参数
    expect(res3.code).toBe(400);
    const res4 = await removeMember({ ns_uid: 'xxx', targetUserCrUid: v4() });
    // 非uuid
    expect(res4.code).toBe(400);
  });
  it('remove unexist user', async () => {
    setAuth(token1);
    const res = await removeMember({
      ns_uid: v4(),
      targetUserCrUid: payload2.userCrUid
    });
    expect(res.code).toBe(403);
    setAuth(token1);
    const res2 = await removeMember({
      ns_uid: ns.uid,
      targetUserCrUid: payload2.userCrUid
    });
    expect(res2.code).toBe(404);
  });
  it('remove self', async () => {
    const nsRes = await createRequest({ teamName: 'team5' });
    const ns = nsRes.data?.namespace!;
    expect(ns).toBeDefined();
    const ns_uid = ns.uid;
    const res = await removeMember({
      ns_uid,
      targetUserCrUid: payload1.userCrUid
    });
    expect(res.code).toBe(403);
  });
  it('remove others', async () => {
    setAuth(token1);
    const res = await inviteMemberRequest({
      ns_uid: ns.uid,
      targetUserId: payload2.userId,
      role: UserRole.Developer
    });
    expect(res.code).toBe(200);
    setAuth(token2);
    const res2 = await verifyInviteRequest({
      ns_uid: ns.uid,
      action: reciveAction.Accepte
    });
    expect(res2.code).toBe(200);
    setAuth(token1);
    const res3 = await removeMember({
      ns_uid: ns.uid,
      targetUserCrUid: payload2.userCrUid
    });
    expect(res3.code).toBe(200);
  });
});
