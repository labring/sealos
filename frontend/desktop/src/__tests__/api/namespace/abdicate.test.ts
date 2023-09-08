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
import { UserRole } from '@/types/team';
import { Session } from 'sealos-desktop-sdk/*';
import * as k8s from '@kubernetes/client-node';
import { Db, MongoClient } from 'mongodb';
import request from '@/__tests__/api/request';
import { _setAuth, cleanDb, cleanK8s } from '../tools';
const abdicateRequest = _abdicateRequest(request);
const createRequest = _createRequest(request);
const inviteMemberRequest = _inviteMemberRequest(request);
const verifyInviteRequest = _verifyInviteRequest(request);
const passwordLoginRequest = _passwordLoginRequest(request);
describe('abdicate team', () => {
  let session: Session;
  let session2: Session;
  let connection: MongoClient;
  let db: Db;
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
    const res = await passwordLoginRequest({ user: 'abdicatetesttest', password: 'testtest' });
    // 保证session合理
    expect(res.data?.user).toBeDefined();
    session = res.data as Session;
    console.log(session.user);
    const res2 = await passwordLoginRequest({ user: 'abdicatetesttest2', password: 'testtest2' });
    // 保证session合理
    expect(res2.data?.user).toBeDefined();
    session2 = res2.data as Session;
    setAuth(session);
    console.log('abdicate team', session2.user);
  }, 100000);
  afterAll(async () => {
    await connection.close();
  });
  describe('owner request', () => {
    it('null param', async () => {
      const res = await abdicateRequest({ ns_uid: '', targetUserId: 'xxx', targetUsername: 'yyy' });
      // 没参数
      expect(res.code).toBe(400);
      const res2 = await abdicateRequest({
        ns_uid: 'zzz',
        targetUserId: '',
        targetUsername: 'yyy'
      });
      // 没参数
      expect(res2.code).toBe(400);
      const res3 = await abdicateRequest({
        ns_uid: 'xxx',
        targetUserId: 'xxx',
        targetUsername: ''
      });
      // 没参数
      expect(res3.code).toBe(400);
    });
    it('abdicate prviate team', async () => {
      const res = await abdicateRequest({
        ns_uid: session.user.ns_uid,
        targetUserId: session2.user.userId,
        targetUsername: session2.user.k8s_username
      });
      expect(res.code).toBe(403);
    });
    it('abdicate unexist team ', async () => {
      const res = await abdicateRequest({
        ns_uid: 'xxx',
        targetUserId: session2.user.userId,
        targetUsername: session2.user.k8s_username
      });
      expect(res.code).toBe(404);
    });
    it('abdicate to self', async () => {
      const nsRes = await createRequest({ teamName: 'team5' });
      const ns = nsRes.data?.namespace!;
      expect(ns).toBeDefined();
      const ns_uid = ns.uid;
      const res = await abdicateRequest({
        ns_uid,
        targetUserId: session.user.userId,
        targetUsername: session.user.k8s_username
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
        targetUserId: session2.user.userId,
        targetUsername: session2.user.k8s_username
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
        // main
        const res = await abdicateRequest({
          ns_uid: ns.uid,
          targetUserId: session2.user.userId,
          targetUsername: session2.user.k8s_username
        });
        expect(res.code).toBe(200);
      },
      100000
    );
  });
});
