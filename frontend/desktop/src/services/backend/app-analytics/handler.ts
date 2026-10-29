import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { verifyOAuth2AccessToken } from '@/services/backend/auth';
import { getCloudConfig } from '@/pages/api/platform/getCloudConfig';
import { getClientIp } from '@/services/backend/requestIp';
import { appEventSchema, toMeasurementEvent } from './protocol';

class AnalyticsError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** No durable state: one bounded minute bucket per server process, never an OAuth DB limit. */
export function createAppAnalyticsHandler(
  options: {
    fetchImpl?: typeof fetch;
    now?: () => number;
  } = {}
) {
  const now = options.now ?? Date.now;
  const fetchImpl = options.fetchImpl ?? fetch;
  let minute = -1;
  let requests = 0;
  const counts = new Map<string, number>();

  return async (req: NextApiRequest, res: NextApiResponse) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        throw new AnalyticsError(405, 'Method not allowed');
      }
      if (req.headers.origin !== undefined) throw new AnalyticsError(403, 'Native events only');
      if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || ''))
        throw new AnalyticsError(415, 'JSON required');
      const measurementId = process.env.GOOGLE_ANALYTICS_MEASUREMENT_ID?.trim();
      const apiSecret = process.env.GOOGLE_ANALYTICS_MP_API_SECRET?.trim();
      if (
        process.env.APP_ANALYTICS_REALM !== 'global' ||
        !/^G-[A-Z0-9]+$/.test(measurementId || '') ||
        !apiSecret
      )
        throw new AnalyticsError(503, 'App analytics is not configured');

      const bucket = Math.floor(now() / 60_000);
      if (minute !== bucket) {
        minute = bucket;
        requests = 0;
        counts.clear();
      }
      const address = getClientIp(req) || 'unknown';
      const count = (counts.get(address) || 0) + 1;
      // 全局上限同时约束 Map 大小，避免匿名接口用不同地址无限分配内存。
      if (++requests > 1200 || count > 120) {
        res.setHeader('Retry-After', '60');
        throw new AnalyticsError(429, 'Too many requests');
      }
      counts.set(address, count);

      const parsed = appEventSchema.safeParse(req.body);
      if (!parsed.success) throw new AnalyticsError(400, 'Invalid analytics event');
      const event = parsed.data;
      const timestamp = new Date(event.occurred_at).getTime();
      if (timestamp > now() + 300_000 || timestamp < now() - 72 * 3600_000)
        throw new AnalyticsError(400, 'Event timestamp is outside the supported window');
      if (event.analytics_consent !== 'granted')
        return res.status(200).json({ accepted: false, reason: 'analytics_denied' });
      if (!event.detailed && ['task_created', 'task_opened'].includes(event.event_name))
        throw new AnalyticsError(403, 'Detailed event permission required');

      let userUid: string | undefined;
      if (req.headers.authorization !== undefined) {
        if (!global.AppConfig) await getCloudConfig();
        const jwtSecret = global.AppConfig?.desktop?.auth?.jwt?.global;
        // auth.ts 有开发默认密钥；此公网接口在配置缺失时必须关闭鉴权路径。
        if (!jwtSecret || jwtSecret === '123456789')
          throw new AnalyticsError(503, 'Native authentication is not configured');
        const bearer = /^Bearer (\S+)$/.exec(req.headers.authorization)?.[1];
        const claims = await verifyOAuth2AccessToken(bearer);
        const clients = (process.env.APP_ANALYTICS_NATIVE_CLIENT_IDS || 'sealos-io')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);
        if (
          !claims ||
          !clients.includes(claims.client_id) ||
          !z.string().uuid().safeParse(claims.sub).success
        )
          throw new AnalyticsError(401, 'Invalid native authentication');
        userUid = claims.sub;
      }

      const url = new URL('https://www.google-analytics.com/mp/collect');
      url.searchParams.set('measurement_id', measurementId!);
      url.searchParams.set('api_secret', apiSecret!);
      const result = await fetchImpl(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toMeasurementEvent(event, userUid)),
        redirect: 'error',
        signal: AbortSignal.timeout(5000)
      });
      if (!result.ok)
        throw new AnalyticsError(
          result.status >= 400 && result.status < 500 && result.status !== 429 ? 400 : 503,
          'Analytics upstream rejected the request'
        );
      return res.status(200).json({ accepted: true, event_id: event.event_id });
    } catch (error) {
      // fetch 错误可能包含带 API secret 的 URL，不能回显或记录原始异常。
      return res.status(error instanceof AnalyticsError ? error.status : 503).json({
        error:
          error instanceof AnalyticsError ? error.message : 'App analytics temporarily unavailable'
      });
    }
  };
}
