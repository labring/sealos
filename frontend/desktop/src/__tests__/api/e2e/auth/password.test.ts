import { Session } from 'sealos-desktop-sdk/*';
import * as k8s from '@kubernetes/client-node';
import { _passwordLoginRequest, _passwordModifyRequest } from '@/api/auth';
import { _setAuth, cleanDb, cleanK8s } from '@/__tests__/api/tools';
import { _createRequest } from '@/api/namespace';
import request from '@/__tests__/api/request';
import { Db, MongoClient } from 'mongodb';
describe('Password', () => {
  let session: Session;
  const createRequest = _createRequest(request);
  const modifyRequest = _passwordModifyRequest(request);
  let db: Db;
  let connection: MongoClient;
  const setAuth = _setAuth(request);
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
    const res = await _passwordLoginRequest(request)({ user: 'createTest', password: 'testtest' });
    expect(res.data?.user).toBeDefined();
    session = res.data!;
    setAuth(session);
    console.log('create,', session.user);
  }, 100000);
  afterAll(async () => {
    await connection.close();
  });
  it('modify: null param', async () => {
    // @ts-ignore
    const res = await modifyRequest({});
    // 没参数
    expect(res.code).toBe(400);
    /** @ts-ignore **/
    const res2 = await modifyRequest({ oldPassword: 'testtest' });
    // 没参数
    expect(res2.code).toBe(400);
    /** @ts-ignore **/
    const res3 = await modifyRequest({ newPassword: 'zxafafa' });
    // 没参数
    expect(res3.code).toBe(400);
  });

  it('error oldPassword', async () => {
    const res = await modifyRequest({ oldPassword: 'test', newPassword: 'testtest' });
    expect(res.code).toBe(409);
  });

  it('same password', async () => {
    const res = await modifyRequest({ oldPassword: 'testtest', newPassword: 'testtest' });
    expect(res.code).toBe(409);
  });
  it('right password', async () => {
    const res = await modifyRequest({ oldPassword: 'testtest', newPassword: 'testtest2' });
    expect(res.code).toBe(200);
    const res2 = await _passwordLoginRequest(request)({
      user: 'createTest',
      password: 'testtest2'
    });
    expect(res2.code).toBe(200);
  });
});
