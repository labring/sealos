import { Session } from 'sealos-desktop-sdk/*';
import * as k8s from '@kubernetes/client-node';
import { _passwordLoginRequest } from '@/api/auth';
import { _setAuth, cleanDb, cleanK8s } from '../tools';
import { _createRequest, _deleteTeamRequest, _swi, _switchRequest } from '@/api/namespace';
import request from '../request';
import { Db, MongoClient } from 'mongodb';
describe('delete team', () => {
  let session: Session;
  let db: Db;
  let connection: MongoClient;
  const setAuth = _setAuth(request);
  const deleteTeamRequest = _deleteTeamRequest(request);
  const createRequest = _createRequest(request);
  const switchRequest = _switchRequest(request);
  beforeAll(async () => {
    //@ts-ignore
    const uri = process.env.MONGODB_URI as string;
    // console.log('MONGODB_URI', uri)
    connection = new MongoClient(uri);
    await connection.connect();
    db = connection.db();
    const kc = new k8s.KubeConfig();
    await cleanK8s(kc, db);
    await cleanDb(db);
    const res = await _passwordLoginRequest(request)({
      user: 'deleteTesttest',
      password: 'testtest'
    });
    // 保证session合理
    expect(res.data?.user).toBeDefined();
    session = res.data!;
    setAuth(session);
    console.log('delete', session.user);
  }, 10000);
  afterAll(async () => {
    await connection.close();
  });
  it('null team', async () => {
    const res = await deleteTeamRequest({ ns_uid: '' });
    // 没参数
    expect(res.code).toBe(400);
    /** @ts-ignore **/
    const res2 = await deleteTeamRequest({ ns_uid: undefined });
    // 没参数
    expect(res2.code).toBe(400);
    /** @ts-ignore **/
    const res3 = await deleteTeamRequest({ ns_uid: null });
    // 没参数
    expect(res3.code).toBe(400);
  });
  it('delete prviate team vaild', async () => {
    const res = await deleteTeamRequest({ ns_uid: session.user.ns_uid });
    expect(res.code).toBe(403);
  });
  it('delete unkown team', async () => {
    const res = await deleteTeamRequest({ ns_uid: 'xasz' });
    expect(res.code).toBe(404);
  });
  it('already exist team', async () => {
    const ns = await createRequest({ teamName: 'testTeam' });
    expect(ns.data).toBeDefined();
    const res = await deleteTeamRequest({ ns_uid: ns.data!.namespace.uid });
    expect(res.code).toBe(200);
  }, 10000);
  it('delete current team', async () => {
    setAuth(session);
    const ns = await createRequest({ teamName: 'testssTeam' });
    expect(ns.data).toBeDefined();
    const ns_uid = ns.data!.namespace.uid;
    const res = await switchRequest(ns_uid);
    expect(res.code).toBe(200);
    expect(res.data).toBeDefined();
    setAuth(res.data!);
    const res2 = await deleteTeamRequest({ ns_uid });
    expect(res2.code).toBe(403);
  });
});
