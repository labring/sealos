import { _passwordLoginRequest } from '@/api/auth';
import {
  _abdicateRequest,
  _createRequest,
  _deleteTeamRequest,
  _inviteMemberRequest,
  _nsListRequest,
  _verifyInviteRequest,
  reciveAction
} from '@/api/namespace';
import { NamespaceDto, UserRole } from '@/types/team';
import { Session } from 'sealos-desktop-sdk/*';
import * as k8s from '@kubernetes/client-node';
import request from '@/__tests__/api/request';
import { _setAuth, cleanDb, cleanK8s } from '@/__tests__/api/tools';
import { AccessTokenPayload } from '@/types/token';
import { prisma } from '@/services/backend/db/init';
import { jwtDecode } from 'jwt-decode';
import { getTeamInviteLimit } from '@/services/enable';
const createRequest = _createRequest(request);
const inviteMemberRequest = _inviteMemberRequest(request);
const verifyInviteRequest = _verifyInviteRequest(request);
const listNamespaceRequest = _nsListRequest(request);
const TEAM_INVITE_LIMIT = getTeamInviteLimit();

describe('invite member', () => {
  let token1: string;
  let payload1: AccessTokenPayload;
  let token2: string;
  let payload2: AccessTokenPayload;
  const setAuth = _setAuth(request);
  let ns: NamespaceDto;
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
    setAuth();
    const res2 = await passwordLoginRequest({ user: 'inviteTesttest2', password: 'testtest2' });
    // 保证session合理
    expect(res2!.data).toBeDefined();
    token2 = res2!.data!.token;
    payload2 = jwtDecode<AccessTokenPayload>(token2);
    setAuth(token1);
    const nsRes = await createRequest({ teamName: 'teamZero' });
    expect(nsRes.data?.namespace).toBeDefined();
    ns = nsRes.data?.namespace!;
  }, 100000);
  // afterAll(async () => {
  //   await connection.close();
  // });
  describe('invite Owner', () => {
    it('invite Owner', async () => {
      const res = await inviteMemberRequest({
        ns_uid: ns.uid,
        targetUserId: payload2.userCrName,
        role: UserRole.Owner
      });
      expect(res.code).toBe(403);
    });
  });
  describe.each([[UserRole.Developer], [UserRole.Manager]])('owner request', (role) => {
    it('null param', async () => {
      setAuth(token1);
      const res = await inviteMemberRequest({ ns_uid: '', targetUserId: 'xxx', role });
      // 没参数
      expect(res.code).toBe(400);
      const res2 = await inviteMemberRequest({
        ns_uid: 'xxx',
        targetUserId: '',
        role
      });

      // 没参数
      expect(res2.code).toBe(400);
      const res3 = await inviteMemberRequest({
        ns_uid: 'xxx',
        targetUserId: 'yyy',
        role: '' as any
      });
      // 没参数
      expect(res3.code).toBe(400);
    });
    it('invite prviate team', async () => {
      setAuth(token1);
      const res = await inviteMemberRequest({
        ns_uid: payload1.workspaceUid,
        targetUserId: payload2.userId,
        role: role
      });
      // bug
      expect(res.code).toBe(403);
    });
    it('invite unkown member', async () => {
      setAuth(token1);
      const res = await inviteMemberRequest({
        ns_uid: ns.uid,
        targetUserId: 'yyy',
        role
      });
      expect(res.code).toBe(404);
    });

    it('invite self', async () => {
      setAuth(token2);
      const ns_uid = ns.uid;
      const res = await inviteMemberRequest({
        ns_uid,
        targetUserId: payload1.userId,
        role
      });
      expect(res.code).toBe(403);
    });
    it('invite exist member', async () => {
      setAuth(token1);
      const nsRes = await createRequest({ teamName: 'teamLimit2' + role });
      expect(nsRes.data?.namespace).toBeDefined();
      const ns = nsRes.data?.namespace!;
      const ns_uid = ns.uid;
      const res = await inviteMemberRequest({
        ns_uid,
        targetUserId: payload2.userId,
        role
      });
      console.log(res);
      console.log(ns);
      console.log(payload1);
      expect(res.code).toBe(200);
      setAuth(token2);
      const res2 = await verifyInviteRequest({ action: reciveAction.Accepte, ns_uid });
      expect(res2.code).toBe(200);
      setAuth(token1);
      const res3 = await inviteMemberRequest({
        ns_uid,
        targetUserId: payload2.userId,
        role
      });
      expect(res3.code).toBe(403);
    }, 10000);
    describe.skip('invite limit', () => {
      let limitToken: string;
      const otherSessions: string[] = [];
      let ns: NamespaceDto;
      beforeAll(async () => {
        const res = await passwordLoginRequest({ user: `invitelimitTest`, password: 'testtest2' });
        // 保证session合理
        expect(res!.data).toBeDefined();
        limitToken = res!.data!.token;
        setAuth(limitToken);
        const nsRes = await createRequest({ teamName: 'teamLimitl' });
        expect(nsRes.data?.namespace).toBeDefined();
        ns = nsRes.data?.namespace!;
      });
      it('invite limit', async () => {
        for (let i = 0; i < 6; i++) {
          const res = await passwordLoginRequest({
            user: `inviteOtherTesttest${i}`,
            password: 'testtest2'
          });
          // 保证session合理
          expect(res?.data?.token).toBeDefined();
          const otherSession = res!.data!.token;
          otherSessions.push(otherSession);
          setAuth(limitToken);
          const inviteRes = await inviteMemberRequest({
            ns_uid: ns.uid,
            targetUserId: jwtDecode<AccessTokenPayload>(otherSession).userCrName,
            role
          });
          console.log(i);
          if (i < TEAM_INVITE_LIMIT) {
            expect(inviteRes.code).toBe(200);
          } else {
            expect(inviteRes.code).toBe(403);
          }
        }
      }, 100000);
    });
  });
});
