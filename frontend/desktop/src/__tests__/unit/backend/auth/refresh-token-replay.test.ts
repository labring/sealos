import { createHash } from 'crypto';

type TokenRow = {
  hash: string;
  sessionId: string;
  consumedAt: Date | null;
  supersededAt: Date | null;
};
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
      ),
      updateMany: vi.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const token of state.tokens.values()) {
          if (token.sessionId !== where.sessionId) continue;
          if (token.consumedAt !== null || token.supersededAt !== null) continue;
          Object.assign(token, data);
          count++;
        }
        return { count };
      }),
      count: vi.fn(
        async ({ where }: any) =>
          [...state.tokens.values()].filter(
            (token) =>
              token.sessionId === where.sessionId &&
              token.consumedAt !== null &&
              token.consumedAt.getTime() > where.consumedAt.gt.getTime()
          ).length
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
            consumedAt: null,
            supersededAt: null
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

describe('a refresh whose response was lost can be repeated', () => {
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
    const row: TokenRow = {
      hash: hash(first),
      sessionId: 'session-id',
      consumedAt: null,
      supersededAt: null
    };
    state.tokens.set(row.hash, row);
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
  const later = () => vi.advanceTimersByTime(3600_000);

  it('replaying the last rotated token returns a new pair and keeps the session', async () => {
    const lost = await refresh(first);
    later();
    const replayed = await refresh(first);
    expect(replayed.access_token).toBe('access-token');
    expect(replayed.refresh_token).not.toBe(lost.refresh_token);
    expect(state.session.revokedAt).toBeNull();
    later();
    expect((await refresh(replayed.refresh_token)).access_token).toBe('access-token');
    expect(state.session.revokedAt).toBeNull();
  });

  it('the replacement that was never delivered revokes the session when presented', async () => {
    const lost = await refresh(first);
    later();
    const replayed = await refresh(first);
    later();
    await rejected(lost.refresh_token);
    expect(state.session.revokedAt).toBeInstanceOf(Date);
    await rejected(replayed.refresh_token);
  });

  it('replaying a token after its replacement was used revokes the session', async () => {
    const second = await refresh(first);
    later();
    const third = await refresh(second.refresh_token);
    later();
    await rejected(first);
    expect(state.session.revokedAt).toBeInstanceOf(Date);
    await rejected(third.refresh_token);
  });
});
