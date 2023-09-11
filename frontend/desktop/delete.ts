import { Session } from "sealos-desktop-sdk/*";
import * as k8s from '@kubernetes/client-node'
import { _passwordLoginRequest } from "@/api/auth";
import { _setAuth, cleanK8s } from "../tools";
import { _createRequest } from "@/api/namespace";
import request from "../request";
import { Db, MongoClient } from "mongodb";
const createRequest = _createRequest(request)
let db:Db
let connection: MongoClient;
const setAuth = _setAuth(request)
beforeAll(async () => {
  //@ts-ignore
  const uri = process.env.MONGODB_URI as string;
  // console.log('MONGODB_URI', uri)
  connection = await MongoClient.connect(uri);
  db = connection.db();
  const kc = new k8s.KubeConfig();
  await cleanK8s(kc, db);
}, 100000);
afterAll(async () => {
  await connection.close();
});
describe.skip('Login create', () => {
  let session: Session;
  const kc = new k8s.KubeConfig();
  beforeAll(async () => {
    await cleanK8s(kc, db);
    const res = await _passwordLoginRequest(request)({ user: 'testtest', password: 'testtest' });
    expect(res.data).toBeDefined();
    session = res.data!;
    // 清理所有的 team
  });
  beforeEach(() => {
    setAuth(session);
  });
  it('null team', async () => {
    const res = await createRequest({ teamName: '' });
    // 没参数
    expect(res.code).toBe(400);
    /** @ts-ignore **/
    const res2 = await createRequest({ teamName: undefined });
    // 没参数
    expect(res2.code).toBe(400);
    /** @ts-ignore **/
    const res3 = await createRequest({ teamName: null });
    // 没参数
    expect(res3.code).toBe(400);
  });
  it('prviate team', async () => {
    const res = await createRequest({ teamName: 'private team' });
    expect(res.code).toBe(409);
  });
  it('not null team', async () => {
    const res = await createRequest({ teamName: 'hello' });
    expect(res.code).toBe(200);
  });
  it('already exist team', async () => {
    const res = await createRequest({ teamName: 'hello' });
    expect(res.code).toBe(409);
  });
  it.each([
    ['team1', 0],
    ['team2', 1],
    ['team3', 2],
    ['team4', 3],
    ['team5', 4],
    ['team6', 5]
  ])(
    'limit 5 team',
    async (teamName: string, idx: number) => {
      const res = await createRequest({ teamName });
      if (idx > 3) expect(res.code).toBe(403);
      else expect(res.code).toBe(200);
    },
    10000
  );
})