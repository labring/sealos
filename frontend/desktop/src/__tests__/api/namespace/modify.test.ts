import { _passwordLoginRequest } from '@/api/auth';
import {
  _abdicateRequest,
  _createRequest,
  _deleteTeamRequest,
  _inviteMemberRequest,
  _modifyRoleRequest,
  _nsListRequest,
  _reciveMessageRequest,
  _removeMemberRequest,
  _teamDetailsRequest,
  _verifyInviteRequest,
  reciveAction
} from '@/api/namespace';
import { NamespaceDto, UserRole } from '@/types/team';
import { Session } from 'sealos-desktop-sdk/*';
import * as k8s from '@kubernetes/client-node';
import { Db, MongoClient } from 'mongodb';
import request from '@/__tests__/api/request';
import { _setAuth, cleanDb, cleanK8s } from '../tools';
const createRequest = _createRequest(request);
const inviteMemberRequest = _inviteMemberRequest(request);
const verifyInviteRequest = _verifyInviteRequest(request);
const passwordLoginRequest = _passwordLoginRequest(request);
const modifyRoleRequest = _modifyRoleRequest(request);
describe('modify role', () => {
  let session: Session;
  let session2: Session;
  let connection: MongoClient;
  let db: Db;
  let ns: NamespaceDto;
  const setAuth = _setAuth(request);
  beforeAll(async () => {
    //@ts-ignore
    const uri = process.env.MONGODB_URI as string;
    connection = new MongoClient(uri);
    await connection.connect();
    db = connection.db();
    const kc = new k8s.KubeConfig();
    await cleanK8s(kc, db);
    await cleanDb(db);
    const res = await passwordLoginRequest({ user: 'modifytesttest', password: 'testtest' });
    // 保证session合理
    expect(res.data?.user).toBeDefined();
    session = res.data as Session;
    const res2 = await passwordLoginRequest({ user: 'modifytesttest2', password: 'testtest2' });
    // 保证session合理
    expect(res2.data?.user).toBeDefined();
    session2 = res2.data as Session;
    setAuth(session);
    const nsRes = await createRequest({ teamName: 'teamZero' });
    expect(nsRes.data?.namespace).toBeDefined();
    ns = nsRes.data?.namespace!;
  }, 100000);
  afterAll(async () => {
    await connection.close();
  });
  describe('owner request', () => {
    it('null param', async () => {
      const res = await modifyRoleRequest({
        ns_uid: '',
        tUserId: 'xxx',
        tK8s_username: 'yyy',
        tRole: UserRole.Developer
      });
      // 没参数
      expect(res.code).toBe(400);
      const res2 = await modifyRoleRequest({
        ns_uid: 'xxx',
        tUserId: '',
        tK8s_username: 'yyy',
        tRole: UserRole.Developer
      });

      // 没参数
      expect(res2.code).toBe(400);
      const res3 = await modifyRoleRequest({
        ns_uid: 'xxx',
        tUserId: 'xxx',
        tK8s_username: '',
        tRole: UserRole.Developer
      });
      // 没参数
      expect(res3.code).toBe(400);
      const res4 = await modifyRoleRequest({
        ns_uid: 'xxx',
        tUserId: 'xxx',
        tK8s_username: 'yyy',
        tRole: '' as any
      });
      // 没参数
      expect(res4.code).toBe(400);
    });
    it.each([[UserRole.Developer], [UserRole.Manager], [UserRole.Owner]])(
      'modify prviate team',
      async (role) => {
        const res = await modifyRoleRequest({
          ns_uid: session.user.ns_uid,
          tUserId: session.user.userId,
          tK8s_username: session.user.k8s_username,
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
          tUserId: 'xxx',
          tK8s_username: 'yyy',
          tRole: role
        });
        expect(res.code).toBe(403);
      }
    );
    it.each([[UserRole.Developer], [UserRole.Manager], [UserRole.Owner]])(
      'modify to self',
      async (role) => {
        const ns_uid = ns.uid;
        const res = await modifyRoleRequest({
          ns_uid,
          tUserId: session.user.userId,
          tK8s_username: session.user.k8s_username,
          tRole: role
        });
        expect(res.code).toBe(403);
      }
    );

    it.each([
      [UserRole.Developer, 'team1'],
      [UserRole.Manager, 'team2']
    ])(
      'modify member',
      async (role, teamName) => {
        setAuth(session);
        // setup
        const nsRes = await createRequest({ teamName });
        const ns = nsRes.data?.namespace!;
        expect(ns).toBeDefined();
        const inviteRes = await inviteMemberRequest({
          ns_uid: ns.uid,
          targetUsername: session2.user.k8s_username,
          role
        });
        expect(inviteRes.code).toBe(200);
        // switch people
        setAuth(session2);
        const verifyRes = await verifyInviteRequest({
          ns_uid: ns.uid,
          action: reciveAction.Accepte
        });
        expect(verifyRes.code).toBe(200);
        // switch people

        setAuth(session);
        console.log('main', session);
        // main
        const res = await modifyRoleRequest({
          ns_uid: ns.uid,
          tUserId: session2.user.userId,
          tK8s_username: session2.user.k8s_username,
          tRole: role
        });
        console.log(res);
        expect(res.code).toBe(200);
      },
      100000
    );
  });
});
