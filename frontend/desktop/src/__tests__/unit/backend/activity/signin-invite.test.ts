import { IncomingMessage, ServerResponse } from 'http';
import { Socket } from 'net';
import type { GetServerSidePropsContext } from 'next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppConfigType } from '@/types/system';

vi.mock('@/services/backend/db/init', () => ({
  globalPrisma: {
    registrationInviteCode: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() }
  }
}));
vi.mock('@/pages/api/platform/getCloudConfig', () => ({ getCloudConfig: vi.fn() }));
vi.mock('next-i18next/serverSideTranslations', () => ({ serverSideTranslations: vi.fn() }));
vi.mock('@/components/v2/Sign', () => ({ default: () => null }));
vi.mock('@/components/v2/SignLayout', () => ({ default: () => null }));
vi.mock('@/stores/config', () => ({ useConfigStore: vi.fn() }));
vi.mock('@/stores/script', () => ({ default: vi.fn() }));
vi.mock('@/hooks/useSemParams', () => ({ useSemParams: vi.fn() }));
vi.mock('@/utils/sessionConfig', () => ({ setAdClickData: vi.fn(), setUserSemData: vi.fn() }));
vi.mock('@/utils/oauth2', () => ({
  setPendingOauth2RequestId: vi.fn(),
  setPendingCodeRequestId: vi.fn()
}));

import { globalPrisma } from '@/services/backend/db/init';
import { getCloudConfig } from '@/pages/api/platform/getCloudConfig';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { getServerSideProps } from '@/pages/signin';
import { buildInviteUrl } from '@/services/backend/activity/constants';
import { webRegistrationFromRequest } from '@/services/backend/activity/registration';
import type { NextApiRequest } from 'next';

const CODE = 'ABCD2345';
const config = {
  cloud: { domain: 'console.example.com' },
  desktop: { layout: { version: 'cn' } }
} as AppConfigType;

const request = (invite?: string | string[], cookies: Record<string, string> = {}) => {
  const req = Object.assign(new IncomingMessage(new Socket()), { cookies });
  req.headers = { 'x-forwarded-proto': 'https', 'accept-language': 'zh' };
  const res = new ServerResponse(req);
  const context = {
    req,
    res,
    query: invite === undefined ? {} : { invite },
    resolvedUrl: '/signin',
    locales: ['en', 'zh']
  } as GetServerSidePropsContext;
  return { req, res, context };
};

const responseCookies = (res: ServerResponse) => {
  const values = res.getHeader('Set-Cookie');
  return Array.isArray(values) ? values : values ? [String(values)] : [];
};

describe('signin invitation SSR', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('AppConfig', undefined);
    vi.mocked(getCloudConfig).mockImplementation(async () => {
      global.AppConfig = config;
      return config.cloud;
    });
    vi.mocked(serverSideTranslations).mockResolvedValue({} as any);
    vi.mocked(globalPrisma.registrationInviteCode.findUnique).mockResolvedValue({
      id: 'code-id',
      inviterUid: 'inviter',
      code: CODE,
      enabled: true,
      createdAt: new Date()
    });
    vi.mocked(globalPrisma.user.findUnique).mockResolvedValue({ uid: 'inviter' } as any);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('initializes config and sets the invite cookie before rendering or an immediate OAuth request', async () => {
    const { res, context } = request(CODE);
    vi.mocked(serverSideTranslations).mockImplementation(async () => {
      expect(
        responseCookies(res).some((cookie) => cookie.startsWith(`sealos_invite=${CODE};`))
      ).toBe(true);
      return {} as any;
    });

    const result = await getServerSideProps(context);

    expect(getCloudConfig).toHaveBeenCalledOnce();
    expect(result.props.inviteIssue).toBeNull();
    expect(responseCookies(res)).toHaveLength(2);
    expect(responseCookies(res)).toContainEqual(expect.stringContaining('NEXT_LOCALE=zh;'));
    const inviteCookie = responseCookies(res).find((cookie) =>
      cookie.startsWith('sealos_invite=')
    )!;
    expect(inviteCookie).toContain('Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000; Secure');
    expect(res.getHeader('Cache-Control')).toContain('no-store');
    // The browser has stored the cookie once the page response arrives, so the
    // very next OAuth request reads the same attribution.
    const authRequest = {
      cookies: { sealos_invite: inviteCookie.split(';')[0].split('=')[1] }
    } as unknown as NextApiRequest;
    expect(webRegistrationFromRequest(authRequest)).toEqual({ source: 'WEB', inviteCode: CODE });
  });

  it('keeps ordinary signin free of invite lookups', async () => {
    const { context, res } = request();
    const result = await getServerSideProps(context);
    expect(result.props.inviteIssue).toBeNull();
    expect(globalPrisma.registrationInviteCode.findUnique).not.toHaveBeenCalled();
    expect(responseCookies(res)).toHaveLength(1);
  });

  it('preserves the first accepted invite on refresh or a later link', async () => {
    const { context, res } = request(CODE, { sealos_invite: 'FIRST234' });
    const result = await getServerSideProps(context);
    expect(result.props.inviteIssue).toBeNull();
    expect(globalPrisma.registrationInviteCode.findUnique).not.toHaveBeenCalled();
    expect(responseCookies(res).some((cookie) => cookie.startsWith('sealos_invite='))).toBe(false);
  });

  it.each(['not_found', 'disabled', 'missing_inviter'] as const)(
    'keeps normal registration available for %s',
    async (reason) => {
      if (reason === 'not_found')
        vi.mocked(globalPrisma.registrationInviteCode.findUnique).mockResolvedValue(null);
      if (reason === 'disabled')
        vi.mocked(globalPrisma.registrationInviteCode.findUnique).mockResolvedValue({
          enabled: false
        } as any);
      if (reason === 'missing_inviter')
        vi.mocked(globalPrisma.user.findUnique).mockResolvedValue(null);
      const { context, res } = request(CODE);
      const result = await getServerSideProps(context);
      expect(result.props.inviteIssue).toBe(reason === 'disabled' ? 'disabled' : 'not_found');
      expect(responseCookies(res).some((cookie) => cookie.startsWith('sealos_invite='))).toBe(
        false
      );
    }
  );

  it('rejects repeated query values without querying the database', async () => {
    const { context } = request([CODE, 'SECOND23']);
    const result = await getServerSideProps(context);
    expect(result.props.inviteIssue).toBe('not_found');
    expect(globalPrisma.registrationInviteCode.findUnique).not.toHaveBeenCalled();
  });

  it('does not accept invitations in international deployments', async () => {
    vi.mocked(getCloudConfig).mockImplementation(async () => {
      global.AppConfig = {
        ...config,
        desktop: { ...config.desktop, layout: { ...config.desktop.layout, version: 'en' } }
      };
      return config.cloud;
    });
    const { context, res } = request(CODE);
    const result = await getServerSideProps(context);
    expect(result.props.inviteIssue).toBe('unavailable');
    expect(globalPrisma.registrationInviteCode.findUnique).not.toHaveBeenCalled();
    expect(responseCookies(res).some((cookie) => cookie.startsWith('sealos_invite='))).toBe(false);
  });

  it.each(['config', 'database'] as const)(
    'reports %s failure and succeeds on explicit retry',
    async (source) => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      if (source === 'config')
        vi.mocked(getCloudConfig).mockRejectedValueOnce(new Error('config unavailable'));
      else
        vi.mocked(globalPrisma.registrationInviteCode.findUnique).mockRejectedValueOnce(
          new Error('database unavailable')
        );
      const failed = request(CODE);
      const failedResult = await getServerSideProps(failed.context);
      expect(failedResult.props.inviteIssue).toBe('error');
      expect(
        responseCookies(failed.res).some((cookie) => cookie.startsWith('sealos_invite='))
      ).toBe(false);
      const retried = request(CODE);
      const retriedResult = await getServerSideProps(retried.context);
      expect(retriedResult.props.inviteIssue).toBeNull();
      expect(responseCookies(retried.res)).toContainEqual(
        expect.stringContaining(`sealos_invite=${CODE};`)
      );
      vi.restoreAllMocks();
    }
  );

  it('generates a direct registration link until the website invitation page is deployed', () => {
    global.AppConfig = config;
    expect(buildInviteUrl(CODE)).toBe(`https://console.example.com/signin?invite=${CODE}`);
    expect(buildInviteUrl('code&extra=value')).toBe(
      'https://console.example.com/signin?invite=code%26extra%3Dvalue'
    );
  });
});
