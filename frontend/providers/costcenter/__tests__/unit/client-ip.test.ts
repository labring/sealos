import type { NextApiRequest } from 'next';
import { describe, expect, it } from 'vitest';

import { getClientIPFromRequest } from '@/utils/tools';

const createRequest = ({
  realIp,
  forwardedFor,
  remoteAddress
}: {
  realIp?: string | string[];
  forwardedFor?: string;
  remoteAddress?: string;
}) =>
  ({
    headers: {
      'x-real-ip': realIp,
      'x-forwarded-for': forwardedFor
    },
    socket: { remoteAddress }
  } as unknown as NextApiRequest);

describe('getClientIPFromRequest', () => {
  it('uses the gateway-overwritten real IP instead of a spoofed forwarded-for value', () => {
    const req = createRequest({
      realIp: '192.168.13.237',
      forwardedFor: '198.51.100.10, 192.168.13.237',
      remoteAddress: '10.0.0.107'
    });

    expect(getClientIPFromRequest(req)).toBe('192.168.13.237');
  });

  it('ignores forwarded-for and falls back to the socket address', () => {
    const req = createRequest({
      forwardedFor: '198.51.100.10',
      remoteAddress: '10.0.0.107'
    });

    expect(getClientIPFromRequest(req)).toBe('10.0.0.107');
  });

  it('trims the trusted header and supports Node header arrays', () => {
    const req = createRequest({
      realIp: [' 192.168.13.237 '],
      remoteAddress: '10.0.0.107'
    });

    expect(getClientIPFromRequest(req)).toBe('192.168.13.237');
  });

  it('returns undefined when neither trusted source is available', () => {
    expect(getClientIPFromRequest(createRequest({}))).toBeUndefined();
  });
});
