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
import { _setAuth, cleanDb, cleanK8s } from '@/__tests__/api/tools';
const createRequest = _createRequest(request);
const inviteMemberRequest = _inviteMemberRequest(request);
const verifyInviteRequest = _verifyInviteRequest(request);
const passwordLoginRequest = _passwordLoginRequest(request);
const modifyRoleRequest = _modifyRoleRequest(request);
const reciveMessageRequest = _reciveMessageRequest(request);
const abdicateRequest = _abdicateRequest(request);
describe('recive message', () => {
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
    const res = await passwordLoginRequest({ user: 'recivetesttest', password: 'testtest' });
    // 保证session合理
    expect(res.data?.user).toBeDefined();
    session = res.data as Session;
    const res2 = await passwordLoginRequest({ user: 'recivetesttest2', password: 'testtest2' });
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
  it('null message', async () => {
    const res = await reciveMessageRequest();
    expect(res.code).toBe(200);
    expect(res.data?.messages.length).toBe(0);
  });
  it('invite member', async () => {
    const res1 = await inviteMemberRequest({
      ns_uid: ns.uid,
      role: UserRole.Developer,
      targetUsername: session2.user.k8s_username
    });
    expect(res1.code).toBe(200);
    setAuth(session2);
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
