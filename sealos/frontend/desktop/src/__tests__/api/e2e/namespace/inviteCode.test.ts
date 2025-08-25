import { _passwordLoginRequest } from '@/api/auth';
import {
  _createRequest,
  _getInviteCodeInfoRequest,
  _getInviteCodeRequest,
  _nsListRequest,
  _verifyInviteCodeRequest,
  reciveAction
} from '@/api/namespace';
import { NamespaceDto, UserRole } from '@/types/team';
import * as k8s from '@kubernetes/client-node';
import request from '@/__tests__/api/request';
import { _setAuth, cleanDb, cleanK8s } from '@/__tests__/api/tools';
import { AccessTokenPayload } from '@/types/token';
import { prisma } from '@/services/backend/db/init';
import { jwtDecode } from 'jwt-decode';
import { getTeamInviteLimit } from '@/services/enable';

const createRequest = _createRequest(request);

const inviteMemberRequest = _getInviteCodeRequest(request);
const getInviteInfoRequest = _getInviteCodeInfoRequest(request);
const verifyInviteRequest = _verifyInviteCodeRequest(request);
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
    // make sure valid session
    expect(res!.data).toBeDefined();
    token1 = res!.data!.token;
    payload1 = jwtDecode<AccessTokenPayload>(token1);
    console.log('payload1', payload1);
    setAuth();
    const res2 = await passwordLoginRequest({ user: 'inviteTesttest2', password: 'testtest2' });
    // make sure valid session
    expect(res2!.data).toBeDefined();
    token2 = res2!.data!.token;
    payload2 = jwtDecode<AccessTokenPayload>(token2);
    setAuth(token1);
    const nsRes = await createRequest({ teamName: 'teamZero' });
    expect(nsRes.data?.namespace).toBeDefined();
    ns = nsRes.data?.namespace!;
  }, 100000);
  describe('invite Owner', () => {
    it('invite Owner', async () => {
      const res = await inviteMemberRequest({
        ns_uid: ns.uid,
        role: UserRole.Owner
      });
      expect(res.code).toBe(403);
    });
  });
  describe.each([[UserRole.Developer], [UserRole.Manager]])('owner request', (role) => {
    it('null param', async () => {
      setAuth(token1);
      const res = await inviteMemberRequest({ ns_uid: '', role });
      // invalid param
      expect(res.code).toBe(400);
      const res3 = await inviteMemberRequest({
        ns_uid: 'xxx',
        role: '' as any
      });

      expect(res3.code).toBe(400);
    });
    it('invite prviate team', async () => {
      setAuth(token1);
      const res = await inviteMemberRequest({
        ns_uid: payload1.workspaceUid,
        role: role
      });
      // bug
      expect(res.code).toBe(403);
    });

    it('invite self', async () => {
      setAuth(token2);
      const ns_uid = ns.uid;
      const { data } = await inviteMemberRequest({
        ns_uid,
        role
      });
      expect(data).toBeDefined();
      const res = await verifyInviteRequest({ code: data!.code, action: reciveAction.Accepte });
      expect(res.code).toBe(403);
    });
    it('invite exist member', async () => {
      setAuth(token1);
      const nsRes = await createRequest({ teamName: 'teamLimit2' + role });
      expect(nsRes.data?.namespace).toBeDefined();
      const ns = nsRes.data?.namespace!;
      const ns_uid = ns.uid;
      const data1 = await inviteMemberRequest({
        ns_uid,
        role
      });
      console.log(ns);
      const res = await verifyInviteRequest({
        code: data1.data!.code,
        action: reciveAction.Accepte
      });
      console.log(payload1);
      expect(res.code).toBe(200);
      setAuth(token2);
      const res2 = await verifyInviteRequest({
        code: data1.data!.code,
        action: reciveAction.Accepte
      });
      expect(res2.code).toBe(403);
    }, 10000);
  });
});
