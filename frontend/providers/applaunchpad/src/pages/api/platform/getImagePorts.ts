import { getImageExposedPorts } from '@/utils/image-exposed-ports';
import { authSession } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { isImagePortsEnabled } from '@/utils/feature-gates';
import { createHash } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;
const MAX_CONCURRENT_REQUESTS = 2;

const requestCounters = new Map<string, { windowStart: number; count: number; active: number }>();

function getRateLimitKey(kubeconfig: string) {
  return createHash('sha256').update(kubeconfig).digest('hex');
}

function acquireRequestSlot(key: string) {
  const now = Date.now();
  for (const [entryKey, entry] of requestCounters) {
    if (entry.active === 0 && now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
      requestCounters.delete(entryKey);
    }
  }

  const current = requestCounters.get(key);
  const entry =
    current && now - current.windowStart < RATE_LIMIT_WINDOW_MS
      ? current
      : { windowStart: now, count: 0, active: 0 };

  if (entry.active >= MAX_CONCURRENT_REQUESTS) {
    requestCounters.set(key, entry);
    return { ok: false, code: 429, error: 'Too many concurrent image port requests' };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    requestCounters.set(key, entry);
    return { ok: false, code: 429, error: 'Too many image port requests' };
  }

  entry.count += 1;
  entry.active += 1;
  requestCounters.set(key, entry);
  return { ok: true };
}

function releaseRequestSlot(key: string) {
  const entry = requestCounters.get(key);
  if (!entry) return;

  entry.active = Math.max(0, entry.active - 1);
  if (entry.active === 0 && Date.now() - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    requestCounters.delete(key);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return jsonRes(res, {
      code: 405,
      error: `Method ${req.method} Not Allowed`
    });
  }

  if (!isImagePortsEnabled()) {
    return jsonRes(res, {
      code: 404,
      error: 'Image port detection is disabled'
    });
  }

  try {
    const kubeconfig = await authSession(req.headers);
    const rateLimitKey = getRateLimitKey(kubeconfig);
    const slot = acquireRequestSlot(rateLimitKey);

    if (!slot.ok) {
      return jsonRes(res, {
        code: slot.code,
        error: slot.error
      });
    }

    try {
      const { imageName, imageRegistry } = req.body as {
        imageName?: string;
        imageRegistry?: {
          username?: string;
          password?: string;
          serverAddress?: string;
        };
      };

      const normalizedImageName = imageName?.trim();

      if (!normalizedImageName) {
        return jsonRes(res, {
          code: 400,
          error: 'imageName is required'
        });
      }

      if (normalizedImageName.length > 512) {
        return jsonRes(res, {
          code: 400,
          error: 'imageName is too long'
        });
      }

      const ports = await getImageExposedPorts(normalizedImageName, imageRegistry);
      return jsonRes(res, { data: { ports } });
    } finally {
      releaseRequestSlot(rateLimitKey);
    }
  } catch (error: any) {
    if (error === 'unAuthorization') {
      return jsonRes(res, {
        code: 401,
        error: 'Unauthorized'
      });
    }

    return jsonRes(res, {
      code: 400,
      error: error?.message || error
    });
  }
}
