import type { NextApiRequest } from 'next';

const readHeader = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0]?.trim() || null;
  return value?.trim() || null;
};

export const getClientIp = (req: NextApiRequest): string | null => {
  // Higress `addXRealIpHeader` replaces X-Real-IP with the downstream peer it
  // observed. This single-value header is trusted only when network policy
  // prevents untrusted callers from bypassing Higress and reaching Desktop.
  const realIp = readHeader(req.headers['x-real-ip']);
  if (realIp) return realIp;

  const forwardedFor = readHeader(req.headers['x-forwarded-for']);
  if (forwardedFor) {
    // When traffic is forced through Higress, XFF values on the left can be
    // supplied by the client while Higress appends its directly connected peer
    // on the right. An upstream proxy or CDN would make this its address instead
    // and requires explicit proxy config.
    const addresses = forwardedFor.split(',').map((address) => address.trim());
    return addresses[addresses.length - 1] || null;
  }

  return req.socket.remoteAddress || null;
};
