import { _passwordLoginRequest } from '@/api/auth';
import {
  _createRequest,
  _inviteMemberRequest,
  _reciveMessageRequest,
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

const createRequest = _createRequest(request);
const inviteMemberRequest = _inviteMemberRequest(request);
const verifyInviteRequest = _verifyInviteRequest(request);
const reciveMessageRequest = _reciveMessageRequest(request);
describe('recive message', () => {
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
  it('null message', async () => {
    const res = await reciveMessageRequest();
    expect(res.code).toBe(200);
    expect(res.data?.messages.length).toBe(0);
  });
  it('invite member', async () => {
    const res1 = await inviteMemberRequest({
      ns_uid: ns.uid,
      role: UserRole.Developer,
      targetUserId: payload2.userId
    });
    expect(res1.code).toBe(200);
    setAuth(token2);
    const res2 = await reciveMessageRequest();
    expect(res2.code).toBe(200);
    expect(res2.data?.messages.length).toBe(1);
    const res3 = await verifyInviteRequest({
      ns_uid: ns.uid,
      action: reciveAction.Accepte
    });
    expect(res3.code).toBe(200);
    const res6 = await reciveMessageRequest();
    expect(res6.code).toBe(200);
    expect(res6.data?.messages.length).toBe(0);
  });
});
