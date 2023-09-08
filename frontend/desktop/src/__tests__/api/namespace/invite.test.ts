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
import { INVITE_LIMIT } from '@/types';
const createRequest = _createRequest(request);
const inviteMemberRequest = _inviteMemberRequest(request);
const verifyInviteRequest = _verifyInviteRequest(request);
const passwordLoginRequest = _passwordLoginRequest(request);
describe('invite member', () => {
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
    const res = await passwordLoginRequest({ user: 'inviteTesttest', password: 'testtest' });
    // 保证session合理
    expect(res.data?.user).toBeDefined();
    session = res.data as Session;
    const res2 = await passwordLoginRequest({ user: 'inviteTesttest2', password: 'testtest2' });
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
  describe('invite Owner', () => {
    it('invite Owner', async () => {
      const res = await inviteMemberRequest({
        ns_uid: ns.uid,
        targetUsername: session2.user.k8s_username,
        role: UserRole.Owner
      });
      expect(res.code).toBe(403);
    });
  });
  describe.each([[UserRole.Developer]])('owner request', (role) => {
    it('null param', async () => {
      setAuth(session);
      const res = await inviteMemberRequest({ ns_uid: '', targetUsername: 'xxx', role });
      // 没参数
      expect(res.code).toBe(400);
      const res2 = await inviteMemberRequest({
        ns_uid: 'xxx',
        targetUsername: '',
        role
      });

      // 没参数
      expect(res2.code).toBe(400);
      const res3 = await inviteMemberRequest({
        ns_uid: 'xxx',
        targetUsername: 'yyy',
        role: '' as any
      });
      // 没参数
      expect(res3.code).toBe(400);
    });
    it('invite prviate team', async () => {
      setAuth(session);
      const res = await inviteMemberRequest({
        ns_uid: session.user.ns_uid,
        targetUsername: session.user.k8s_username,
        role: role
      });
      expect(res.code).toBe(403);
    });
    it('invite unkown member', async () => {
      setAuth(session);
      const res = await inviteMemberRequest({
        ns_uid: ns.uid,
        targetUsername: 'yyy',
        role
      });
      expect(res.code).toBe(404);
    });

    it('invite self', async () => {
      setAuth(session);
      const ns_uid = ns.uid;
      const res = await inviteMemberRequest({
        ns_uid,
        targetUsername: session.user.k8s_username,
        role
      });
      expect(res.code).toBe(403);
    });
    it('invite exist member', async () => {
      setAuth(session);
      const nsRes = await createRequest({ teamName: 'teamLimit2' });
      expect(nsRes.data?.namespace).toBeDefined();
      const ns = nsRes.data?.namespace!;
      const ns_uid = ns.uid;
      const res = await inviteMemberRequest({
        ns_uid,
        targetUsername: session2.user.k8s_username,
        role
      });
      expect(res.code).toBe(200);
      setAuth(session2);
      const res2 = await verifyInviteRequest({ action: reciveAction.Accepte, ns_uid });
      expect(res2.code).toBe(200);
      setAuth(session);
      const res3 = await inviteMemberRequest({
        ns_uid,
        targetUsername: session2.user.k8s_username,
        role
      });
      expect(res3.code).toBe(403);
    });
    describe('invite limit', () => {
      let limitSession: Session;
      const otherSessions: Session[] = [];
      let ns: NamespaceDto;
      beforeAll(async () => {
        const res = await passwordLoginRequest({ user: `invitelimitTest`, password: 'testtest2' });
        // 保证session合理
        expect(res.data?.user).toBeDefined();
        limitSession = res.data as Session;
        setAuth(limitSession);
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
          expect(res.data?.user).toBeDefined();
          const otherSession = res.data as Session;
          otherSessions.push(otherSession);
          setAuth(limitSession);
          const inviteRes = await inviteMemberRequest({
            ns_uid: ns.uid,
            targetUsername: otherSession.user.k8s_username,
            role
          });
          console.log(i);
          if (i < INVITE_LIMIT) {
            expect(inviteRes.code).toBe(200);
          } else {
            expect(inviteRes.code).toBe(403);
          }
        }
      }, 100000);
    });
  });
});
