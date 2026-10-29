import { createHash, createHmac } from 'crypto';
import { sign, verify } from 'jsonwebtoken';
import { z } from 'zod';
import {
  AcquisitionSchema,
  AppAnalyticsContextSchema,
  readAcquisitionCookie
} from '@/schema/app-attribution';

const ISSUER = 'sealos-desktop-analytics';
const AUDIENCE = 'sealos-app-analytics-handoff';
const clients = new Set(['sealos-io', 'sealox-desktop-bja']);
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const analyticsCookieName = (id: string) => `sealos_app_attr_${id}`;
export const analyticsCookieHeader = (id: string, token: string, origin: string) =>
  `${analyticsCookieName(
    id
  )}=${token}; HttpOnly; SameSite=Lax; Path=/api/auth/oauth2/code; Max-Age=${token ? 600 : 0}${
    origin.startsWith('https:') ? '; Secure' : ''
  }`;

const secret = () => {
  const key = global.AppConfig?.desktop.auth.jwt.global;
  // Domain-separated signing key: an analytics receipt cannot verify as an auth JWT.
  return key && key !== '123456789'
    ? createHmac('sha256', key).update('sealos:app-analytics-handoff:v1').digest('hex')
    : undefined;
};
export function analyticsRealm(origin: string): 'china' | 'global' | undefined {
  try {
    const url = new URL(origin);
    if (url.protocol !== 'https:') return;
    if (url.hostname === 'sealos.io' || url.hostname.endsWith('.sealos.io')) return 'global';
    if (url.hostname === 'sealos.run' || url.hostname.endsWith('.sealos.run')) return 'china';
  } catch {
    return;
  }
}
type Binding = { id: string; clientId: string; state: string };
const envelope = z.object({
  kind: z.enum(['request', 'receipt']),
  request_id: z.string().min(1).max(100),
  client_id: z.string(),
  state_hash: z.string().regex(/^[a-f0-9]{64}$/),
  installation_id: AppAnalyticsContextSchema.shape.installation_id,
  context: AcquisitionSchema,
  sub: z.string().uuid().optional()
});
const decode = (raw: string | undefined, kind: 'request' | 'receipt', binding: Binding) => {
  const key = secret();
  if (!raw || raw.length > 4096 || !key || !clients.has(binding.clientId)) return;
  try {
    const parsed = envelope.parse(
      verify(raw, key, { algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE })
    );
    if (
      parsed.kind !== kind ||
      parsed.request_id !== binding.id ||
      parsed.client_id !== binding.clientId ||
      parsed.state_hash !== hash(binding.state)
    )
      return;
    return parsed;
  } catch {
    return;
  }
};
export function beginAnalyticsHandoff(
  params: Record<string, string>,
  requestId: string,
  cookie: unknown,
  origin: string
): string | undefined {
  try {
    const realm = analyticsRealm(origin),
      key = secret();
    if (!realm || !key || !clients.has(params.client_id) || params.analytics_consent !== 'granted')
      return;
    const context = readAcquisitionCookie(cookie, realm);
    if (!context) return;
    const installation = AppAnalyticsContextSchema.shape.installation_id.safeParse(
      params.analytics_installation_id
    );
    if (!installation.success) return;
    return sign(
      {
        kind: 'request',
        request_id: requestId,
        client_id: params.client_id,
        state_hash: hash(params.state),
        installation_id: installation.data,
        context: {
          version: context.version,
          realm: context.realm,
          visitor_id: context.visitor_id,
          consent: context.consent
        }
      },
      key,
      { algorithm: 'HS256', issuer: ISSUER, audience: AUDIENCE, expiresIn: 600 }
    );
  } catch {
    return;
  }
}
export function approveAnalyticsHandoff(
  raw: string | undefined,
  binding: Binding,
  userUid: string,
  cookie: unknown,
  origin: string
) {
  try {
    const pending = decode(raw, 'request', binding),
      realm = analyticsRealm(origin),
      key = secret();
    if (!pending || !realm || !key) return;
    // Re-read current consent: a revoked root Cookie cannot be revived by the request snapshot.
    const current = readAcquisitionCookie(cookie, realm);
    if (
      !current ||
      current.visitor_id !== pending.context.visitor_id ||
      pending.context.realm !== realm
    )
      return;
    const context = AppAnalyticsContextSchema.parse({
      ...current,
      subject_id: userUid,
      installation_id: pending.installation_id
    });
    const token = sign(
      {
        kind: 'receipt',
        request_id: binding.id,
        client_id: binding.clientId,
        state_hash: hash(binding.state),
        installation_id: pending.installation_id,
        context: current,
        sub: userUid
      },
      key,
      { algorithm: 'HS256', issuer: ISSUER, audience: AUDIENCE, expiresIn: 300 }
    );
    return { token, context };
  } catch {
    return;
  }
}
export function redeemAnalyticsHandoff(
  raw: string | undefined,
  binding: Binding,
  userUid: string,
  origin: string
) {
  try {
    const receipt = decode(raw, 'receipt', binding);
    if (!receipt || receipt.sub !== userUid || receipt.context.realm !== analyticsRealm(origin))
      return;
    return AppAnalyticsContextSchema.parse({
      ...receipt.context,
      subject_id: userUid,
      installation_id: receipt.installation_id
    });
  } catch {
    return;
  }
}
