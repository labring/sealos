import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { Prisma } from 'prisma/global/generated/client';
import { globalPrisma } from '../db/init';
import { generateMarketingConsentToken } from '../auth';
import { AcquisitionError, realm, requireWebsiteOrigin, websiteOrigins } from './config';
import { acquisitionContextSchema, type AcquisitionContext } from './protocol';

export const tokenHash = (value: string) => createHash('sha256').update(value).digest('hex');
const token = () => randomBytes(32).toString('base64url');
const expires = () => new Date(Date.now() + 600_000);
const installationSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[A-Za-z0-9._:/-]+$/);
const validCapability = (value: unknown) => {
  const parsed = z
    .string()
    .regex(/^[A-Za-z0-9_-]{43}$/)
    .safeParse(value);
  if (!parsed.success) throw new AcquisitionError(400, 'Invalid capability');
  return parsed.data;
};
const parseContext = (input: unknown) => {
  const parsed = acquisitionContextSchema.safeParse(input);
  if (!parsed.success) throw new AcquisitionError(400, 'Invalid acquisition context');
  const context = parsed.data;
  // The receipt is an assertion from the source website, not verified advertising consent.
  if (context.consent.analytics_storage !== 'granted')
    return {
      version: 1 as const,
      consent: context.consent
    };
  if (context.sea_attr) {
    try {
      const raw = JSON.parse(Buffer.from(context.sea_attr, 'base64url').toString('utf8'));
      const adFields =
        /^(click_id_value|click_value|gclid|gbraid|wbraid|msclkid|fbclid|ttclid|rdt_cid|li_fat_id|twclid|email|phone|user_data|hashed_user_data|email_sha256|phone_sha256)$/i;
      const hasAdData = (value: unknown): boolean => {
        if (!value || typeof value !== 'object') return false;
        return Object.entries(value).some(
          ([key, entry]) => (adFields.test(key) && !!entry) || hasAdData(entry)
        );
      };
      if (
        ![2, 3].includes(raw?.version) ||
        ((context.consent.ad_storage !== 'granted' || context.consent.ad_user_data !== 'granted') &&
          hasAdData(raw))
      )
        delete context.sea_attr;
    } catch {
      delete context.sea_attr;
    }
    // Omit a forbidden opaque snapshot; never silently mutate bytes bound to its hash.
  }
  return context;
};

export async function issueAcquisition(input: unknown, origin: string) {
  requireWebsiteOrigin(origin);
  const payload = parseContext(input);
  if (payload.consent.analytics_storage !== 'granted')
    throw new AcquisitionError(403, 'Analytics permission required');
  const code = token();
  const expiresAt = expires();
  await globalPrisma.acquisitionHandoff.create({
    data: {
      tokenHash: tokenHash(code),
      websiteOrigin: origin,
      realm: realm(),
      payload: payload as Prisma.InputJsonValue,
      postedAt: new Date(),
      expiresAt
    }
  });
  return { code, expires_at: expiresAt.toISOString() };
}

export async function redeemAcquisition(input: unknown) {
  const parsed = z
    .object({ code: z.string(), installation_id: installationSchema })
    .strict()
    .safeParse(input);
  if (!parsed.success) throw new AcquisitionError(400, 'Invalid installation handoff');
  const code = validCapability(parsed.data.code);
  const next = token();
  return globalPrisma.$transaction(
    async (db) => {
      const existing = await db.acquisitionHandoff.findUnique({
        where: { tokenHash: tokenHash(code) }
      });
      if (
        !existing ||
        existing.realm !== realm() ||
        existing.requestId ||
        existing.redeemedAt ||
        existing.expiresAt <= new Date()
      )
        throw new AcquisitionError(400, 'Invalid or expired handoff');
      const changed = await db.acquisitionHandoff.updateMany({
        where: {
          tokenHash: existing.tokenHash,
          redeemedAt: null,
          requestId: null,
          expiresAt: { gt: new Date() }
        },
        data: {
          redeemedAt: new Date(),
          installationId: parsed.data.installation_id,
          installationTokenHash: tokenHash(next)
        }
      });
      if (changed.count !== 1) throw new AcquisitionError(409, 'Handoff already redeemed');
      return { installation_token: next, expires_at: existing.expiresAt.toISOString() };
    },
    { isolationLevel: 'Serializable' }
  );
}

/** Optional acquisition failure must never disable an otherwise valid OAuth login. */
export async function beginAcquisition(
  params: Record<string, string>,
  requestId: string,
  authOrigin: string
) {
  if (
    params.analytics_consent !== 'granted' ||
    !installationSchema.safeParse(params.installation_id).success
  )
    return;
  try {
    const selectedRealm = realm();
    if (params.acquisition_token) {
      const capability = validCapability(params.acquisition_token);
      const attached = await globalPrisma.acquisitionHandoff.updateMany({
        where: {
          installationTokenHash: tokenHash(capability),
          realm: selectedRealm,
          installationId: params.installation_id,
          requestId: null,
          expiresAt: { gt: new Date() }
        },
        data: { requestId }
      });
      if (attached.count !== 1) throw new AcquisitionError(400, 'Installation handoff is invalid');
      return;
    }
    const websiteOrigin = requireWebsiteOrigin(params.website_origin || websiteOrigins()[0]);
    const handoff = token();
    await globalPrisma.acquisitionHandoff.create({
      data: {
        tokenHash: tokenHash(handoff),
        requestId,
        installationId: params.installation_id,
        websiteOrigin,
        realm: selectedRealm,
        expiresAt: expires()
      }
    });
    const target = new URL('/app-attribution', websiteOrigin);
    target.searchParams.set('handoff', handoff);
    target.searchParams.set('authority', authOrigin);
    return target.toString();
  } catch {
    console.warn('Optional OAuth acquisition initialization failed');
  }
}

export async function attachAcquisition(input: unknown, origin: string) {
  const parsed = z.object({ handoff: z.string() }).passthrough().safeParse(input);
  if (!parsed.success) throw new AcquisitionError(400, 'Invalid handoff');
  const { handoff, ...context } = parsed.data;
  const payload = parseContext(context);
  const changed = await globalPrisma.acquisitionHandoff.updateMany({
    where: {
      tokenHash: tokenHash(validCapability(handoff)),
      realm: realm(),
      websiteOrigin: requireWebsiteOrigin(origin),
      postedAt: null,
      requestId: { not: null },
      expiresAt: { gt: new Date() }
    },
    data: { payload: payload as Prisma.InputJsonValue, postedAt: new Date() }
  });
  if (changed.count !== 1)
    throw new AcquisitionError(400, 'Invalid, expired or already used handoff');
}

export async function acquisitionContinuation(
  raw: unknown,
  cookieFor: (id: string) => string | undefined
) {
  const handoff = await globalPrisma.acquisitionHandoff.findUnique({
    where: { tokenHash: tokenHash(validCapability(raw)) }
  });
  if (!handoff?.requestId || handoff.realm !== realm() || handoff.expiresAt <= new Date())
    throw new AcquisitionError(400, 'Invalid handoff');
  const request = await globalPrisma.oAuthAuthorizationRequest.findUnique({
    where: { id: handoff.requestId }
  });
  const secret = cookieFor(handoff.requestId);
  if (
    !request ||
    !secret ||
    tokenHash(secret) !== request.browserHash ||
    request.status !== 'PENDING' ||
    request.expiresAt <= new Date()
  )
    throw new AcquisitionError(403, 'Original authorization browser required');
  return `/oauth2/code?request_id=${request.id}`;
}

export async function commitAcquisition(requestId: string, userUid: string) {
  try {
    await globalPrisma.$transaction(
      async (db) => {
        const handoff = await db.acquisitionHandoff.findUnique({ where: { requestId } });
        if (
          !handoff ||
          handoff.linkedAt ||
          !handoff.installationId ||
          handoff.realm !== realm() ||
          handoff.expiresAt <= new Date()
        )
          return;
        const context = acquisitionContextSchema.safeParse(handoff.payload);
        if (!context.success || context.data.consent.analytics_storage !== 'granted') return;
        // Recheck the authentication fact: attaching browser context alone cannot bind an account.
        const request = await db.oAuthAuthorizationRequest.findUnique({ where: { id: requestId } });
        if (request?.status !== 'CONSUMED' || request.userUid !== userUid) return;
        await db.acquisitionIdentity.upsert({
          where: { requestId },
          update: {},
          create: {
            requestId,
            userUid,
            realm: handoff.realm,
            installationId: handoff.installationId,
            visitorId: context.data.visitor_id,
            websiteOrigin: handoff.websiteOrigin,
            journeyStartedAt: request.createdAt,
            payload: context.data as Prisma.InputJsonValue
          }
        });
        await db.acquisitionHandoff.update({
          where: { requestId },
          data: { linkedAt: new Date() }
        });
        const user = await db.user.findUnique({ where: { uid: userUid } });
        if (user && user.createdAt >= request.createdAt) {
          // Account creation is the signup fact; repeated App logins cannot create it.
          const event = {
            version: 1,
            event_id: `signup:${userUid}`,
            event_name: 'signup',
            acquisition_request_id: requestId,
            occurred_at: user.createdAt.toISOString(),
            subject_id: userUid,
            realm: handoff.realm,
            properties: {}
          };
          await db.productAnalyticsEvent.upsert({
            where: { eventId: `lifecycle:signup:${userUid}` },
            update: {},
            create: {
              eventId: `lifecycle:signup:${userUid}`,
              subjectId: userUid,
              realm: handoff.realm,
              occurredAt: user.createdAt,
              payload: { kind: 'lifecycle', event }
            }
          });
        }
      },
      { isolationLevel: 'Serializable' }
    );
  } catch {
    console.warn('OAuth succeeded but acquisition association was not committed');
  }
}

export async function subjectSnapshot(userUid: string) {
  const link = await globalPrisma.acquisitionIdentity.findFirst({
    where: { realm: realm(), userUid },
    orderBy: { linkedAt: 'asc' }
  });
  if (!link) return null;
  const context = acquisitionContextSchema.parse(link.payload);
  if (context.consent.analytics_storage !== 'granted') return null;
  // Domestic has no legacy sea_attr. Encode the same source semantics separately;
  // an existing overseas raw value is never rewritten or extended.
  let seaAttr = context.sea_attr;
  if (!seaAttr) {
    const source = context.source;
    const landing = new URL(source?.landing_page || '/', link.websiteOrigin);
    const touch = {
      campaign: source?.campaign || '',
      channel: '',
      content: '',
      term: '',
      source: source?.source || '',
      medium: source?.medium || '',
      click_id_type: '',
      click_id_value: '',
      landing_hostname: landing.hostname,
      landing_path: landing.pathname,
      ts:
        source?.timestamp && !Number.isNaN(Date.parse(source.timestamp))
          ? new Date(source.timestamp).toISOString()
          : link.linkedAt.toISOString()
    };
    seaAttr = Buffer.from(
      JSON.stringify({ version: 3, first_touch: touch, last_touch: touch })
    ).toString('base64url');
  }
  return {
    version: 1 as const,
    subject_id: userUid,
    realm: link.realm,
    sea_attr: seaAttr,
    consent: {
      ...context.consent,
      ad_storage: 'unspecified' as const,
      ad_user_data: 'unspecified' as const,
      ad_personalization: 'unspecified' as const
    },
    linked_at: link.linkedAt.toISOString(),
    consent_token: generateMarketingConsentToken({
      sub: userUid,
      region: global.AppConfig?.cloud.regionUID || 'unknown',
      attribution_hash: tokenHash(seaAttr),
      ad_personalization: 'unspecified',
      ad_user_data_consent: 'unspecified'
    })
  };
}
