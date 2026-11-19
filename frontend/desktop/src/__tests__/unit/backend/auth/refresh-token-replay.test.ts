import { createHash } from 'crypto';

const state = vi.hoisted(() => ({
  tokens: new Map<string, any>(),
  session: {} as any
}));
const mocks = vi.hoisted(() => ({
  db: {
    oAuthClient: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    oAuthCodeRefreshToken: {
      findUnique: vi.fn(async ({ where }: any) => {
        const token = state.tokens.get(where.hash);
        return token ? { ...token, session: { ...state.session } } : null;
      }),
      update: vi.fn(async ({ where, data }: any) =>
        Object.assign(state.tokens.get(where.hash), data)
      )
    },
    oAuthRefreshSession: {
      update: vi.fn(async ({ data }: any) => {
        const { tokens, ...rest } = data;
        Object.assign(state.session, rest);
        if (tokens?.create)
          state.tokens.set(tokens.create.hash, {
            hash: tokens.create.hash,
            sessionId: state.session.id,
            consumedAt: null
          });
      })
    },
    $transaction: vi.fn()
  }
}));
vi.mock('@/services/backend/db/init', () => ({ globalPrisma: mocks.db }));
vi.mock('@/services/backend/auth', () => ({
  generateOAuth2AccessToken: vi.fn(() => 'access-token')
}));
import { refreshCodeToken } from '@/services/backend/oauth2/authorization-code';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const first = 'sc_rt_first';
const refresh = (token: string) =>
  refreshCodeToken({ client_id: 'sealos-io', refresh_token: token });
const rejected = (token: string) =>
  expect(refresh(token)).rejects.toMatchObject({ error: 'invalid_grant' });

describe('a refresh whose response was lost can be retried', () => {
  const previous = global.AppConfig;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-18T00:00:00Z'));
    global.AppConfig = {
      desktop: { auth: { oauth2idp: { enabled: true, authorizationCodeEnabled: true } } }
    } as any;
    state.session = {
      id: 'session-id',
      clientId: 'sealos-io',
      userUid: 'b7fa951a-1683-4a43-82f0-a6e1089f96ea',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 86400_000)
    };
    state.tokens.clear();
    state.tokens.set(hash(first), { hash: hash(first), sessionId: 'session-id', consumedAt: null });
    mocks.db.$transaction.mockImplementation((run: any) => run(mocks.db));
    mocks.db.oAuthClient.findUnique.mockResolvedValue({
      clientId: 'sealos-io',
      clientType: 'PUBLIC',
      allowedGrantTypes: ['authorization_code', 'refresh_token']
    });
    mocks.db.user.findUnique.mockResolvedValue({
      uid: state.session.userUid,
      id: '1234',
      nickname: 'Alice'
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    global.AppConfig = previous;
  });
  const wait = (seconds: number) => vi.advanceTimersByTime(seconds * 1000);

  it('retrying a spent token within the grace window returns a new pair', async () => {
    const lost = await refresh(first);
    wait(59);
    const retried = await refresh(first);
    expect(retried.access_token).toBe('access-token');
    expect(retried.refresh_token).not.toBe(lost.refresh_token);
    expect(state.session.revokedAt).toBeNull();
    wait(3600);
    expect((await refresh(retried.refresh_token)).access_token).toBe('access-token');
    expect(state.session.revokedAt).toBeNull();
  });

  it('retrying does not extend the grace window', async () => {
    await refresh(first);
    wait(40);
    await refresh(first);
    wait(40);
    await rejected(first);
    expect(state.session.revokedAt).toBeInstanceOf(Date);
  });

  it('a spent token presented after the grace window revokes the session', async () => {
    const second = await refresh(first);
    wait(61);
    await rejected(first);
    expect(state.session.revokedAt).toBeInstanceOf(Date);
    await rejected(second.refresh_token);
  });
});
