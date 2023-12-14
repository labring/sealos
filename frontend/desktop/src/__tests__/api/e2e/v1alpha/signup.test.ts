import { Session } from 'sealos-desktop-sdk/*';
import * as k8s from '@kubernetes/client-node';
import { _passwordLoginRequest, _passwordModifyRequest } from '@/api/auth';
import { _setAuth, cleanDb, cleanK8s } from '@/__tests__/api/tools';
import { _createRequest } from '@/api/namespace';
import request from '@/__tests__/api/request';
import { Db, MongoClient } from 'mongodb';
import { ApiResp } from '@/types';
import RandExp from 'randexp';

export const getUserAndPassword = () => {
  const userFactory = new RandExp('[a-zA-Z0-9_-]{10,16}');
  const password = new RandExp(/\w{8,20}/).gen();
  return {
    username: userFactory.gen(),
    password
  };
};
describe('v1alpha/signup', () => {
  const generateRequest = (data: { username: string; password: string }) =>
    request.post<any, ApiResp<Omit<Session, 'token'>>>('/api/v1alpha/password/signup', data);
  const signinRequest = (data: { username: string; password: string }) =>
    request.post<typeof data, ApiResp<Omit<Session, 'token'>>>(
      '/api/v1alpha/password/signin',
      data
    );
  let db: Db;
  let connection: MongoClient;
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
  }, 100000);
  afterAll(async () => {
    await connection.close();
  });
  it.each([[1], [2], [3], [4], [5]])(
    'sign up test',
    async (time) => {
      const user = getUserAndPassword();
      if (!user) return;
      expect.assertions(2);
      const genRes = await generateRequest(user);
      expect(genRes.data).toBeDefined();
      console.log(`the ${time} times`);
      console.log(`session`, genRes.data);
      if (genRes.code === 200) {
        const res = await signinRequest(user);
        expect(res.data?.kubeconfig).toBe(genRes.data?.kubeconfig);
      } else {
        const res = await signinRequest(user);
        expect(res.code).toBe(403);
      }
      setAuth({});
    },
    10000
  );
});
