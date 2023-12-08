import * as k8s from '@kubernetes/client-node';
import { _passwordLoginRequest, _passwordModifyRequest } from '@/api/auth';
import { _setAuth, cleanDb, cleanK8s } from '@/__tests__/api/tools';
import request from '@/__tests__/api/request';
import { PrismaClient } from 'prisma/region/generated/client';

describe('Password', () => {
  const modifyRequest = _passwordModifyRequest(request);
  console.log('?', process.env.REGION_DATABASE_URL!);
  const prisma = new PrismaClient({
    datasourceUrl: process.env.REGION_DATABASE_URL!
  });
  // let db;
  const setAuth = _setAuth(request);
  const passwordLoginRequest = _passwordLoginRequest(request, setAuth);
  beforeAll(async () => {
    // await prisma.$connect();
    const kc = new k8s.KubeConfig();
    console.log('clean start!');
    await cleanK8s(kc, prisma);
    await cleanDb(prisma);
    console.log('clean end');
    const res = await passwordLoginRequest({ user: 'createTest', password: 'testtest' });
    const token = res?.data?.token!;
    expect(token).toBeDefined();
    setAuth(token);
    console.log('create,', token);
  }, 100000);
  afterAll(async () => {
    // await prisma.$disconnect();
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
    expect(res.code).toBe(200);
  });
  it('right password', async () => {
    const res = await modifyRequest({ oldPassword: 'testtest', newPassword: 'testtest2' });
    expect(res.code).toBe(200);
    const res2 = await passwordLoginRequest({
      user: 'createTest',
      password: 'testtest2'
    });
    expect(res2?.code).toBe(200);
  });
});
