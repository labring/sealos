import { _passwordLoginRequest } from '@/api/auth';
import {
  _abdicateRequest,
  _createRequest,
  _inviteMemberRequest,
  _verifyInviteRequest,
  reciveAction
} from '@/api/namespace';
import { UserRole } from '@/types/team';
import * as k8s from '@kubernetes/client-node';
import request from '@/__tests__/api/request';
import { _setAuth, cleanDb, cleanK8s } from '@/__tests__/api/tools';
import { prisma } from '@/services/backend/db/init';
import { AccessTokenPayload } from '@/types/token';
import { jwtDecode } from 'jwt-decode';
const abdicateRequest = _abdicateRequest(request);
const createRequest = _createRequest(request);
const inviteMemberRequest = _inviteMemberRequest(request);
const verifyInviteRequest = _verifyInviteRequest(request);
describe('abdicate team', () => {
  let token1: string;
  let token2: string;
  let payload1: AccessTokenPayload;
  let payload2: AccessTokenPayload;
  const setAuth = _setAuth(request);
  const passwordLoginRequest = _passwordLoginRequest(request, setAuth);
  beforeAll(async () => {
    //@ts-ignore
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
    // clear token
    setAuth();
    const res2 = await passwordLoginRequest({ user: 'abdicatetesttest2', password: 'testtest2' });
    // 保证session合理
    expect(res2!.data).toBeDefined();
    token2 = res2!.data!.token;
    payload2 = jwtDecode<AccessTokenPayload>(token2);
    console.log('abdicate team', payload2);
    setAuth(token1);
  }, 100000);
  afterAll(async () => {
    // await connection.close();
  });
  describe('owner request', () => {
    it('null param', async () => {
      const res = await abdicateRequest({ ns_uid: '', targetUserCrUid: 'xxx' });
      // 没参数
      expect(res.code).toBe(400);
      const res2 = await abdicateRequest({
        ns_uid: 'zzz',
        targetUserCrUid: ''
      });
      // 没参数
      expect(res2.code).toBe(400);
    });
    it('abdicate prviate team', async () => {
      const res = await abdicateRequest({
        ns_uid: payload1.workspaceUid,
        targetUserCrUid: payload2.userCrUid
      });
      expect(res.code).toBe(403);
    });
    it('abdicate invaild team ', async () => {
      const res = await abdicateRequest({
        ns_uid: 'xxx',
        targetUserCrUid: payload2.userCrUid
      });
      expect(res.code).toBe(400);
    });
    it('abdicate to self', async () => {
      const nsRes = await createRequest({ teamName: 'team5' });
      const ns = nsRes.data?.namespace!;
      expect(ns).toBeDefined();
      const ns_uid = ns.uid;
      const res = await abdicateRequest({
        ns_uid,
        targetUserCrUid: payload1.userCrUid
      });
      expect(res.code).toBe(409);
    });
    it('abdicate unkown', async () => {
      const teamName = 'team0';
      const nsRes = await createRequest({ teamName });
      const ns = nsRes.data?.namespace!;
      expect(ns).toBeDefined();
      const ns_uid = ns.uid;
      // 没被拉入
      const res = await abdicateRequest({
        ns_uid,
        targetUserCrUid: payload2.userCrUid
      });
      expect(res.code).toBe(404);
    });
    it.each([
      [UserRole.Developer, 'team1'],
      [UserRole.Manager, 'team2']
    ])(
      'abdicate member',
      async (role, teamName) => {
        // setup
        const nsRes = await createRequest({ teamName });
        const ns = nsRes.data?.namespace!;
        expect(ns).toBeDefined();
        const inviteRes = await inviteMemberRequest({
          targetUserId: payload2.userId,
          ns_uid: ns.uid,
          role
        });
        expect(inviteRes.code).toBe(200);
        // switch people
        setAuth(token2);
        const verifyRes = await verifyInviteRequest({
          ns_uid: ns.uid,
          action: reciveAction.Accepte
        });
        expect(verifyRes.code).toBe(200);
        // switch people
        setAuth(token1);
        // main
        const res = await abdicateRequest({
          ns_uid: ns.uid,
          targetUserCrUid: payload2.userCrUid
        });
        expect(res.code).toBe(200);
      },
      100000
    );
  });
});
