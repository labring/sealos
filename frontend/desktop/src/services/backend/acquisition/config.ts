import { timingSafeEqual } from 'node:crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

export class AcquisitionError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
export const realm = () => {
  const value = process.env.ACQUISITION_REALM;
  if (value !== 'china' && value !== 'global')
    throw new AcquisitionError(503, 'Acquisition is not configured');
  return value;
};
export function websiteOrigins() {
  const hosts =
    realm() === 'global' ? ['sealos.io', 'www.sealos.io'] : ['sealos.run', 'www.sealos.run'];
  const rawOrigins = process.env.ACQUISITION_WEBSITE_ORIGINS?.trim();
  const configured = rawOrigins
    ? rawOrigins
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
    : undefined;
  return (configured || hosts.map((host) => `https://${host}`)).filter((origin) => {
    try {
      const u = new URL(origin);
      return u.origin === origin && u.protocol === 'https:' && hosts.includes(u.hostname);
    } catch {
      return false;
    }
  });
}
export const requireWebsiteOrigin = (origin?: string) => {
  if (!origin || !websiteOrigins().includes(origin))
    throw new AcquisitionError(403, 'Website origin is not allowed');
  return origin;
};
export function requireIngestSecret(req: NextApiRequest) {
  const configured = process.env.ACQUISITION_INGEST_SECRET;
  const actual = req.headers.authorization?.replace(/^Bearer /, '');
  if (
    !configured ||
    !actual ||
    Buffer.byteLength(configured) !== Buffer.byteLength(actual) ||
    !timingSafeEqual(new TextEncoder().encode(configured), new TextEncoder().encode(actual))
  )
    throw new AcquisitionError(401, 'Unauthorized');
}
export async function respond(res: NextApiResponse, run: () => Promise<unknown>) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  try {
    return await run();
  } catch (error) {
    const known = error instanceof AcquisitionError;
    if (!known) console.warn('Acquisition request failed');
    return res
      .status(known ? error.status : 503)
      .json({ error: known ? error.message : 'Acquisition temporarily unavailable' });
  }
}
export function websiteCors(req: NextApiRequest, res: NextApiResponse) {
  const origin = requireWebsiteOrigin(req.headers.origin);
  // Emit only literal reviewed origins, never reflect a request-controlled header.
  switch (origin) {
    case 'https://sealos.io':
      res.setHeader('Access-Control-Allow-Origin', 'https://sealos.io');
      break;
    case 'https://www.sealos.io':
      res.setHeader('Access-Control-Allow-Origin', 'https://www.sealos.io');
      break;
    case 'https://sealos.run':
      res.setHeader('Access-Control-Allow-Origin', 'https://sealos.run');
      break;
    case 'https://www.sealos.run':
      res.setHeader('Access-Control-Allow-Origin', 'https://www.sealos.run');
      break;
    default:
      throw new AcquisitionError(403, 'Website origin is not allowed');
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return false;
  }
  if (req.method !== 'POST') throw new AcquisitionError(405, 'Method not allowed');
  if (!req.headers['content-type']?.startsWith('application/json'))
    throw new AcquisitionError(415, 'JSON required');
  return true;
}
