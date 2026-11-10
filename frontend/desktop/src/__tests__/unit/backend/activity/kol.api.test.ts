import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/backend/auth', () => ({
  verifyAccessToken: vi.fn(),
  verifyGlobalToken: vi.fn()
}));
vi.mock('@/services/backend/activity/kol', async (original) => {
  const actual = await original<typeof import('@/services/backend/activity/kol')>();
  return {
    ...actual,
    previewKolActivation: vi.fn(),
    activateKol: vi.fn(),
    reserveKolAttempt: vi.fn()
  };
});
import preview from '@/pages/api/account/activity/kol/preview';
import activate from '@/pages/api/account/activity/kol/activate';
import { verifyAccessToken } from '@/services/backend/auth';
import {
  activateKol,
  previewKolActivation,
  reserveKolAttempt,
  KolActivationError
} from '@/services/backend/activity/kol';

const code = 'A'.repeat(32);
const request = async (handler: typeof preview, body: unknown, method = 'POST') => {
  const res = { json: vi.fn(), setHeader: vi.fn() };
  await handler({ method, headers: {}, body } as any, res as any);
  return res;
};
describe('KOL activation HTTP boundary', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(verifyAccessToken).mockResolvedValue({ userUid: 'signed-in-user' } as any);
  });
  it('requires a signed-in account and never activates from a GET request', async () => {
    expect((await request(activate, { code }, 'GET')).json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 405 })
    );
    vi.mocked(verifyAccessToken).mockResolvedValue(undefined as any);
    expect((await request(activate, { code })).json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 401 })
    );
    expect(activateKol).not.toHaveBeenCalled();
  });
  it('returns a no-store preview without consuming the code', async () => {
    const data = {
      account: { userUid: 'signed-in-user', userId: 'id', nickname: 'name' },
      inviterRewardAmount: '10000000',
      inviteeRewardAmount: '0',
      ruleRevision: 1
    };
    vi.mocked(previewKolActivation).mockResolvedValue(data);
    const res = await request(preview, { code });
    expect(res.json).toHaveBeenCalledWith({ code: 200, message: '', data });
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(activateKol).not.toHaveBeenCalled();
  });
  it('activates only the authenticated account and passes confirmation to the service', async () => {
    vi.mocked(activateKol).mockResolvedValue({ activated: true });
    const res = await request(activate, {
      code,
      expectedUserUid: 'signed-in-user',
      ruleRevision: 1,
      userUid: 'forged-user'
    });
    expect(activateKol).toHaveBeenCalledWith('signed-in-user', {
      code,
      expectedUserUid: 'signed-in-user',
      ruleRevision: 1
    });
    expect(res.json).toHaveBeenCalledWith({ code: 200, message: '', data: { activated: true } });
  });
  it.each(['used_code', 'revoked_code', 'already_activated', 'account_changed', 'rule_changed'])(
    'returns the explicit %s error without fabricated success',
    async (reason) => {
      vi.mocked(activateKol).mockRejectedValue(new KolActivationError(reason, 409));
      expect(
        (await request(activate, { code, expectedUserUid: 'signed-in-user', ruleRevision: 1 })).json
      ).toHaveBeenCalledWith({ code: 409, message: reason, data: null });
    }
  );
  it('limits guesses before reading a code or consuming a claim', async () => {
    vi.mocked(reserveKolAttempt).mockRejectedValue(new KolActivationError('rate_limited', 429));
    expect((await request(preview, { code })).json).toHaveBeenCalledWith({
      code: 429,
      message: 'rate_limited',
      data: null
    });
    expect(previewKolActivation).not.toHaveBeenCalled();
    expect(activateKol).not.toHaveBeenCalled();
  });
});
