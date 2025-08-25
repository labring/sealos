import * as k8s from '@kubernetes/client-node';
import { _passwordLoginRequest } from '@/api/auth';
import { _setAuth, cleanDb, cleanK8s } from '@/__tests__/api/tools';
import { _createRequest } from '@/api/namespace';
import request from '@/__tests__/api/request';
import { getTeamLimit } from '@/services/enable';
import { prisma } from '@/services/backend/db/init';
import { jwtDecode } from 'jwt-decode';
import { AccessTokenPayload } from '@/types/token';

describe('Login create', () => {
  const createRequest = _createRequest(request);
  let token1: string;
  let token2: string;
  let payload1: AccessTokenPayload;
  let payload2: AccessTokenPayload;
  const setAuth = _setAuth(request);
  const passwordLoginRequest = _passwordLoginRequest(request, setAuth);
  beforeAll(async () => {
    //@ts-ignore
    // console.log('MONGODB_URI', uri)
    const kc = new k8s.KubeConfig();
    await cleanK8s(kc, prisma);
    await cleanDb(prisma);
    setAuth();
    const res = await passwordLoginRequest({ user: 'abdicatetesttest', password: 'testtest' });
    // 保证session合理
    expect(res!.data).toBeDefined();
    token1 = res!.data!.token;
    payload1 = jwtDecode<AccessTokenPayload>(token1);
    console.log('payload1', payload1);
    setAuth(token1);
  }, 100000);
  afterAll(async () => {
    // await connection.close();
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
  it.skip.each(new Array(getTeamLimit() + 2).map((_, idx) => [`team${idx}`, idx]))(
    'limit 4 team',
    async (teamName: string, idx: number) => {
      if (idx === 0) {
        // const res = await _passwordLoginRequest(request)({
        //     user: 'createTest5',
        //     password: 'testtest'
        // });
        // expect(res.data?.user).toBeDefined();
        // session = res.data!;
        // setAuth(session);
        const res = await passwordLoginRequest({ user: 'abdicatetesttest', password: 'testtest' });
        // 保证session合理
        expect(res!.data).toBeDefined();
        token1 = res!.data!.token;
        payload1 = jwtDecode<AccessTokenPayload>(token1);
        setAuth(token1);
      }
      const res = await createRequest({ teamName });
      console.log('curIdx', idx, 'code', res.code);
      if (idx >= getTeamLimit()) expect(res.code).toBe(403);
      else expect(res.code).toBe(200);
    },
    10000
  );
});
