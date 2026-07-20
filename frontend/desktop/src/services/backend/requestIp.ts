import type { NextApiRequest } from 'next';

const readHeader = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0]?.trim() || null;
  return value?.trim() || null;
};

export const getClientIp = (req: NextApiRequest): string | null => {
  const realIp = readHeader(req.headers['x-real-ip']);
  if (realIp) return realIp;

  const forwardedFor = readHeader(req.headers['x-forwarded-for']);
  if (forwardedFor) {
    const addresses = forwardedFor.split(',').map((address) => address.trim());
    return addresses[addresses.length - 1] || null;
  }

  return req.socket.remoteAddress || null;
};
