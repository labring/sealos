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
  _switchRequest,
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
const switchRequest = _switchRequest(request);
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
    setAuth(session);
    const nsRes = await createRequest({ teamName: 'teamZero' });
    expect(nsRes.data?.namespace).toBeDefined();
    ns = nsRes.data?.namespace!;
  }, 100000);
  afterAll(async () => {
    await connection.close();
  });
  it('easy switch', async () => {
    const res1 = await switchRequest(ns.uid);
    expect(res1.code).toBe(200);
    expect(res1.data).toMatchObject<Session>({
      user: {
        k8s_username: session.user.k8s_username,
        userId: session.user.userId,
        ns_uid: ns.uid,
        nsid: ns.id
      }
    });
  });
});
