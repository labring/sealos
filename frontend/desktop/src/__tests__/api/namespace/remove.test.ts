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
const abdicateRequest = _abdicateRequest(request);
const createRequest = _createRequest(request);
const inviteMemberRequest = _inviteMemberRequest(request);
const verifyInviteRequest = _verifyInviteRequest(request);
const passwordLoginRequest = _passwordLoginRequest(request);
const removeMember = _removeMemberRequest(request);
describe('remove member', () => {
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
    const res = await passwordLoginRequest({ user: 'removetesttest', password: 'testtest' });
    // 保证session合理
    expect(res.data?.user).toBeDefined();
    session = res.data as Session;
    const res2 = await passwordLoginRequest({ user: 'removetesttest2', password: 'testtest2' });
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
  it('null param', async () => {
    const res = await removeMember({ ns_uid: '', tUserId: 'xxx', tK8s_username: 'yyy' });
    // 没参数
    expect(res.code).toBe(400);
    const res2 = await removeMember({ ns_uid: 'xxx', tUserId: '', tK8s_username: 'yyy' });
    // 没参数
    expect(res2.code).toBe(400);
    const res3 = await removeMember({ ns_uid: 'xxx', tUserId: 'xxx', tK8s_username: '' });
    // 没参数
    expect(res3.code).toBe(400);
  });
  it('remove ', async () => {
    const res = await abdicateRequest({
      ns_uid: session.user.ns_uid,
      targetUserId: session2.user.userId,
      targetUsername: session2.user.k8s_username
    });
    expect(res.code).toBe(403);
  });
  it('remove unexist user', async () => {
    const res = await removeMember({
      ns_uid: 'xxx',
      tUserId: session2.user.userId,
      tK8s_username: session2.user.k8s_username
    });
    expect(res.code).toBe(404);
  });
  it('remove self', async () => {
    const nsRes = await createRequest({ teamName: 'team5' });
    const ns = nsRes.data?.namespace!;
    expect(ns).toBeDefined();
    const ns_uid = ns.uid;
    const res = await removeMember({
      ns_uid,
      tUserId: session.user.userId,
      tK8s_username: session.user.k8s_username
    });
    expect(res.code).toBe(403);
  });
  it('remove others', async () => {
    setAuth(session);
    const res = await inviteMemberRequest({
      ns_uid: ns.uid,
      targetUsername: session2.user.k8s_username,
      role: UserRole.Developer
    });
    expect(res.code).toBe(200);
    setAuth(session2);
    const res2 = await verifyInviteRequest({
      ns_uid: ns.uid,
      action: reciveAction.Accepte
    });
    expect(res2.code).toBe(200);
    setAuth(session);
    const res3 = await removeMember({
      ns_uid: ns.uid,
      tUserId: session2.user.userId,
      tK8s_username: session2.user.k8s_username
    });
    expect(res3.code).toBe(200);
  });
});
