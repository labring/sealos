import type { Prisma, ProductAnalyticsEvent } from 'prisma/global/generated/client';
import { globalPrisma } from '../db/init';
import { AcquisitionError, realm } from './config';
import {
  acquisitionContextSchema,
  appEventSchema,
  lifecycleSchema,
  installationClientId,
  toMeasurementEvent
} from './protocol';

function eventTime(occurredAt: string, trustedHistorical = false) {
  const date = new Date(occurredAt);
  if (
    date.getTime() > Date.now() + 300_000 ||
    (!trustedHistorical && date.getTime() < Date.now() - 72 * 3600_000)
  )
    throw new AcquisitionError(400, 'Event timestamp is outside the supported window');
  return date;
}

export async function acceptAppEvent(input: unknown, userUid?: string) {
  if (realm() !== 'global') throw new AcquisitionError(403, 'Global analytics is not enabled here');
  const parsed = appEventSchema.safeParse(input);
  if (!parsed.success) throw new AcquisitionError(400, 'Invalid analytics event');
  const event = parsed.data;
  if (event.analytics_consent !== 'granted') return { accepted: false, reason: 'analytics_denied' };
  if (!event.detailed && ['task_created', 'task_opened'].includes(event.event_name))
    throw new AcquisitionError(403, 'Detailed event permission required');
  const occurredAt = eventTime(event.occurred_at);
  const payload = toMeasurementEvent(event, userUid);
  const record = await globalPrisma.productAnalyticsEvent.upsert({
    where: { eventId: event.event_id },
    update: {},
    create: {
      eventId: event.event_id,
      realm: 'global',
      subjectId: event.detailed ? userUid : undefined,
      installationId: event.detailed ? event.installation_id : undefined,
      occurredAt,
      payload: payload as Prisma.InputJsonValue
    }
  });
  return { accepted: true, event_id: record.eventId };
}

export async function acceptLifecycle(input: unknown) {
  const parsed = lifecycleSchema.safeParse(input);
  if (!parsed.success) throw new AcquisitionError(400, 'Invalid lifecycle event');
  const event = parsed.data;
  const selectedRealm = realm();
  if (event.realm && event.realm !== selectedRealm)
    throw new AcquisitionError(403, 'Wrong account realm');
  const occurredAt = eventTime(event.occurred_at, true);
  // A delayed trusted billing event can still name the account that was merged.
  // Only the authentication service's immutable merge ledger may resolve it.
  let canonicalSubject = event.subject_id;
  const seen = new Set<string>();
  for (;;) {
    if (seen.has(canonicalSubject) || seen.size >= 10)
      throw new AcquisitionError(409, 'Account merge chain is invalid');
    seen.add(canonicalSubject);
    const merged = await globalPrisma.mergeUserTransactionInfo.findUnique({
      where: { mergeUserUid: canonicalSubject }
    });
    if (!merged) break;
    canonicalSubject = merged.userUid;
  }
  const record = await globalPrisma.productAnalyticsEvent.upsert({
    where: { eventId: `lifecycle:${event.event_id}` },
    update: {},
    create: {
      eventId: `lifecycle:${event.event_id}`,
      realm: selectedRealm,
      subjectId: canonicalSubject,
      occurredAt,
      payload: { kind: 'lifecycle', event } as Prisma.InputJsonValue
    }
  });
  return { accepted: true, event_id: record.eventId };
}

class TransportFiltered extends Error {}

async function sendMeasurementPayload(record: ProductAnalyticsEvent) {
  let measurement = record.payload;
  if (
    record.subjectId &&
    measurement &&
    typeof measurement === 'object' &&
    !Array.isArray(measurement) &&
    'user_id' in measurement
  ) {
    measurement = { ...measurement, user_id: record.subjectId };
  }
  if (
    measurement &&
    typeof measurement === 'object' &&
    !Array.isArray(measurement) &&
    measurement.kind === 'lifecycle'
  ) {
    const event = lifecycleSchema.parse(measurement.event);
    const link = await globalPrisma.acquisitionIdentity.findFirst({
      where: {
        realm: record.realm,
        userUid: record.subjectId || event.subject_id,
        ...(event.event_name === 'signup' && event.acquisition_request_id
          ? {
              requestId: event.acquisition_request_id,
              journeyStartedAt: { lte: record.occurredAt }
            }
          : { linkedAt: { lte: record.occurredAt } })
      },
      orderBy: { linkedAt: 'desc' }
    });
    if (
      !link ||
      acquisitionContextSchema.parse(link.payload).consent.analytics_storage !== 'granted'
    )
      throw new Error('No permitted attribution at event time');
    measurement = {
      client_id: installationClientId(link.installationId),
      user_id: record.subjectId || event.subject_id,
      timestamp_micros: record.occurredAt.getTime() * 1000,
      consent: { ad_user_data: 'DENIED', ad_personalization: 'DENIED' },
      events: [
        {
          name: event.event_name,
          params: {
            ...event.properties,
            event_id: event.event_id,
            surface: 'server',
            product_edition: record.realm,
            ...(event.workspace_id ? { workspace_id: event.workspace_id } : {}),
            ...(event.transaction_id ? { transaction_id: event.transaction_id } : {})
          }
        }
      ]
    };
  }
  if (record.realm !== 'global') {
    // China is never sent to Google. A configured Rybbit server transport owns this destination.
    const origin = process.env.ACQUISITION_RYBBIT_ORIGIN;
    const siteId = process.env.ACQUISITION_RYBBIT_SITE_ID;
    const apiKey = process.env.ACQUISITION_RYBBIT_API_KEY;
    if (!origin || !siteId || !apiKey) throw new Error('Rybbit transport is not configured');
    const url = new URL('/api/track', origin);
    if (url.protocol !== 'https:') throw new Error('Rybbit requires HTTPS');
    const payload = measurement as {
      user_id?: string;
      events?: { name: string; params: object }[];
    };
    const event = payload.events?.[0];
    if (!event) throw new Error('Invalid stored event');
    const response = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(4000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        site_id: siteId,
        type: 'custom_event',
        event_name: event.name,
        user_id: payload.user_id ? `china:${payload.user_id}` : undefined,
        properties: JSON.stringify(event.params)
      })
    });
    if (!response.ok) throw new Error('Rybbit rejected event');
    const text = await response.text();
    if (/event not tracked|over monthly limit/i.test(text))
      throw new TransportFiltered('Rybbit filtered event');
    let receipt: { success?: boolean };
    try {
      receipt = JSON.parse(text);
    } catch {
      throw new Error('Invalid Rybbit receipt');
    }
    if (receipt?.success !== true) throw new Error('Rybbit did not acknowledge event');
    return;
  }
  const measurementId = process.env.GOOGLE_ANALYTICS_MEASUREMENT_ID;
  const secret = process.env.GOOGLE_ANALYTICS_MP_API_SECRET;
  if (!measurementId || !secret) throw new Error('GA4 MP is not configured');
  const url = new URL('https://www.google-analytics.com/mp/collect');
  url.searchParams.set('measurement_id', measurementId);
  url.searchParams.set('api_secret', secret);
  const response = await fetch(url, {
    method: 'POST',
    signal: AbortSignal.timeout(4000),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(measurement)
  });
  if (!response.ok) throw new Error('MP rejected event');
}

/** A database lease permits multiple replicas; ACK loss remains at-least-once delivery. */
export async function flushAnalytics(limit = 20) {
  const now = new Date();
  const records = await globalPrisma.productAnalyticsEvent.findMany({
    where: {
      realm: realm(),
      status: { not: 'DELIVERED' },
      OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }]
    },
    orderBy: { createdAt: 'asc' },
    take: Math.min(limit, 100)
  });
  let delivered = 0;
  for (const record of records) {
    const lease = new Date(Date.now() + 60_000);
    const claimed = await globalPrisma.productAnalyticsEvent.updateMany({
      where: {
        eventId: record.eventId,
        status: { not: 'DELIVERED' },
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }]
      },
      data: { status: 'SENDING', leaseUntil: lease, attempts: { increment: 1 } }
    });
    if (claimed.count !== 1) continue;
    try {
      // Do not silently remap expired events to today's GA4 timestamp.
      if (record.occurredAt.getTime() < Date.now() - 72 * 3600_000) {
        await globalPrisma.productAnalyticsEvent.update({
          where: { eventId: record.eventId },
          data: { status: 'EXPIRED', leaseUntil: new Date('9999-01-01T00:00:00Z') }
        });
        continue;
      }
      await sendMeasurementPayload(record);
      await globalPrisma.productAnalyticsEvent.update({
        where: { eventId: record.eventId },
        data: { status: 'DELIVERED', deliveredAt: new Date(), leaseUntil: null }
      });
      delivered++;
    } catch (error) {
      await globalPrisma.productAnalyticsEvent.update({
        where: { eventId: record.eventId },
        data: {
          status: error instanceof TransportFiltered ? 'FILTERED' : 'PENDING',
          leaseUntil:
            error instanceof TransportFiltered
              ? new Date('9999-01-01T00:00:00Z')
              : new Date(
                  Date.now() + Math.min(3600_000, 60_000 * 2 ** Math.min(record.attempts, 6))
                )
        }
      });
    }
  }
  return { examined: records.length, delivered };
}
