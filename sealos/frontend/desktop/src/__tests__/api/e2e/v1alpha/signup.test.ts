import { Session } from 'sealos-desktop-sdk/*';
import * as k8s from '@kubernetes/client-node';
import { _setAuth, cleanDb, cleanK8s } from '@/__tests__/api/tools';
import request from '@/__tests__/api/request';
import { ApiResp } from '@/types';
import RandExp from 'randexp';
import { prisma } from '@/services/backend/db/init';

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
  const setAuth = _setAuth(request);
  beforeAll(async () => {
    const kc = new k8s.KubeConfig();
    await cleanK8s(kc, prisma);
    await cleanDb(prisma);
  }, 100000);
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
      setAuth();
    },
    10000
  );
});
