import { _passwordLoginRequest } from '@/api/auth';
import {
  _createRequest,
  _inviteMemberRequest,
  _modifyRoleRequest,
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

const createRequest = _createRequest(request);
const inviteMemberRequest = _inviteMemberRequest(request);
const verifyInviteRequest = _verifyInviteRequest(request);
const modifyRoleRequest = _modifyRoleRequest(request);
describe('modify role', () => {
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
  describe('owner request', () => {
    it('null param', async () => {
      const res = await modifyRoleRequest({
        ns_uid: '',
        targetUserCrUid: 'xxx',
        tRole: UserRole.Developer
      });
      // 没参数
      expect(res.code).toBe(400);
      const res2 = await modifyRoleRequest({
        ns_uid: v4(),
        targetUserCrUid: '',
        tRole: UserRole.Developer
      });

      // 没参数
      expect(res2.code).toBe(400);
      const res3 = await modifyRoleRequest({
        ns_uid: 'xxx',
        targetUserCrUid: v4(),
        tRole: UserRole.Developer
      });
      expect(res2.code).toBe(400);
      const res5 = await modifyRoleRequest({
        ns_uid: v4(),
        targetUserCrUid: 'xxx',
        tRole: UserRole.Developer
      });
      // 没参数
      expect(res5.code).toBe(400);
      const res4 = await modifyRoleRequest({
        ns_uid: v4(),
        targetUserCrUid: v4(),
        tRole: '' as any
      });
      // 没参数
      expect(res4.code).toBe(400);
    });
    it.each([[UserRole.Developer], [UserRole.Manager], [UserRole.Owner]])(
      'modify prviate team',
      async (role) => {
        const res = await modifyRoleRequest({
          ns_uid: payload1.workspaceUid,
          targetUserCrUid: payload1.userCrUid,
          tRole: role
        });
        expect(res.code).toBe(403);
      }
    );
    it.each([[UserRole.Developer], [UserRole.Manager], [UserRole.Owner]])(
      'modify unexist member',
      async (role) => {
        const res = await modifyRoleRequest({
          ns_uid: ns.uid,
          targetUserCrUid: payload2.userCrUid,
          tRole: role
        });
        expect(res.code).toBe(404);
      }
    );
    it.each([[UserRole.Developer], [UserRole.Manager], [UserRole.Owner]])(
      'modify to self',
      async (role) => {
        setAuth(token1);
        const ns_uid = ns.uid;
        const res = await modifyRoleRequest({
          ns_uid,
          targetUserCrUid: payload1.userCrUid,
          tRole: role
        });
        console.log(res);
        expect(res.code).toBe(403);
      }
    );

    it.each([
      [UserRole.Developer, 'team1'],
      [UserRole.Manager, 'team2']
    ])(
      'modify member',
      async (role, teamName) => {
        setAuth(token1);
        // setup
        const nsRes = await createRequest({ teamName });
        const ns = nsRes.data?.namespace!;
        expect(ns).toBeDefined();
        const inviteRes = await inviteMemberRequest({
          ns_uid: ns.uid,
          targetUserId: payload2.userId,
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
        const res = await modifyRoleRequest({
          ns_uid: ns.uid,
          targetUserCrUid: payload2.userCrUid,
          tRole: role
        });
        console.log(res);
        expect(res.code).toBe(200);
      },
      100000
    );
  });
});
