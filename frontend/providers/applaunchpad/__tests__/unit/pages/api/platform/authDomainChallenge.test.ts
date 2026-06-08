// @vitest-environment node
import crypto from 'crypto';
import { EventEmitter } from 'events';
import { Readable } from 'stream';
import type { NextApiRequest, NextApiResponse } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler, {
  formatChallengeHost,
  isPublicIp,
  sanitizeChallengeDomain
} from '@/pages/api/platform/authDomainChallenge';
import { queryA, queryAAAA } from '@/services/dns-resolver';
import { getK8s } from '@/services/backend/kubernetes';
import https from 'https';

const TEST_DOMAIN_CHALLENGE_SECRET = vi.hoisted(() => ['test', 'secret'].join('-'));

vi.mock('nanoid', () => ({
  customAlphabet: () => () => 'abcdefghijklmnop'
}));

vi.mock('@/services/dns-resolver', () => ({
  queryA: vi.fn(),
  queryAAAA: vi.fn()
}));

vi.mock('@/services/backend/kubernetes', () => ({
  getK8s: vi.fn()
}));

vi.mock('https', () => ({
  default: {
    request: vi.fn()
  }
}));

vi.mock('@/config', () => ({
  Config: () => ({
    launchpad: {
      domainChallengeSecret: TEST_DOMAIN_CHALLENGE_SECRET
    }
  })
}));

const mockedQueryA = vi.mocked(queryA);
const mockedQueryAAAA = vi.mocked(queryAAAA);
const mockedGetK8s = vi.mocked(getK8s);
const mockedHttpsRequest = vi.mocked(https.request);

const createResponse = () => {
  const res = {
    json: vi.fn((payload) => payload)
  } as unknown as NextApiResponse & { json: ReturnType<typeof vi.fn> };

  return res;
};

const callHandler = async (body: unknown, authorization = 'kubeconfig') => {
  const req = {
    body,
    headers: authorization ? { authorization } : {}
  } as unknown as NextApiRequest;
  const res = createResponse();

  await handler(req, res);

  return res.json.mock.calls[0][0];
};

const createValidChallengeResponse = (host = 'example.com') => {
  const timestamp = Math.floor(Date.now() / 1000);
  const signatureData = `${host}:abcdefghijklmnop:${timestamp}:applaunchpad:false`;
  const signature = crypto
    .createHmac('sha256', TEST_DOMAIN_CHALLENGE_SECRET)
    .update(signatureData)
    .digest('hex');

  return {
    host,
    token: 'abcdefghijklmnop',
    timestamp,
    service: 'applaunchpad',
    isProxy: false,
    signature
  };
};

const mockHttpsResponse = (body: unknown, statusCode = 200) => {
  mockedHttpsRequest.mockImplementationOnce((options: any, callback: any) => {
    const req = new EventEmitter() as any;
    req.end = vi.fn();

    const res = Readable.from([Buffer.from(JSON.stringify(body))]) as any;
    res.statusCode = statusCode;
    res.headers = {
      'content-type': 'application/json'
    };

    callback(res);

    return req;
  });
};

describe('authDomainChallenge SSRF protections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    mockedGetK8s.mockResolvedValue({
      namespace: 'ns-test',
      k8sCore: {
        listNamespacedService: vi.fn().mockResolvedValue({})
      }
    } as any);
  });

  describe('sanitizeChallengeDomain', () => {
    it('accepts normalized public hostnames only', () => {
      expect(sanitizeChallengeDomain(' Example.COM. ')).toBe('example.com');
      expect(sanitizeChallengeDomain('sub.example.co')).toBe('sub.example.co');
    });

    it('rejects URL control characters and internal hostnames', () => {
      expect(sanitizeChallengeDomain('example.com:8080')).toBeNull();
      expect(sanitizeChallengeDomain('example.com/path#')).toBeNull();
      expect(sanitizeChallengeDomain('example.com?target=1')).toBeNull();
      expect(sanitizeChallengeDomain('user@example.com')).toBeNull();
      expect(sanitizeChallengeDomain('localhost')).toBeNull();
      expect(sanitizeChallengeDomain('account-service.account-system.svc')).toBeNull();
      expect(sanitizeChallengeDomain('kubernetes.default.svc.cluster.local')).toBeNull();
      expect(sanitizeChallengeDomain('10.0.0.1')).toBeNull();
    });
  });

  describe('isPublicIp', () => {
    it('rejects private and reserved addresses', () => {
      expect(isPublicIp('10.0.0.1')).toBe(false);
      expect(isPublicIp('127.0.0.1')).toBe(false);
      expect(isPublicIp('169.254.169.254')).toBe(false);
      expect(isPublicIp('172.16.0.1')).toBe(false);
      expect(isPublicIp('192.168.1.1')).toBe(false);
      expect(isPublicIp('192.0.0.1')).toBe(false);
      expect(isPublicIp('192.0.2.1')).toBe(false);
      expect(isPublicIp('198.51.100.1')).toBe(false);
      expect(isPublicIp('203.0.113.1')).toBe(false);
      expect(isPublicIp('::1')).toBe(false);
      expect(isPublicIp('fc00::1')).toBe(false);
      expect(isPublicIp('fe80::1')).toBe(false);
      expect(isPublicIp('febf::1')).toBe(false);
      expect(isPublicIp('ff02::1')).toBe(false);
      expect(isPublicIp('::ffff:10.0.0.1')).toBe(false);
      expect(isPublicIp('::ffff:7f00:1')).toBe(false);
      expect(isPublicIp('::127.0.0.1')).toBe(false);
      expect(isPublicIp('::a00:1')).toBe(false);
      expect(isPublicIp('2002:0a00:0001::1')).toBe(false);
      expect(isPublicIp('2002:c0a8:0001::1')).toBe(false);
    });

    it('allows public addresses', () => {
      expect(isPublicIp('93.184.216.34')).toBe(true);
      expect(isPublicIp('192.0.1.1')).toBe(true);
      expect(isPublicIp('2001:4860:4860::8888')).toBe(true);
    });
  });

  it('formats IPv6 hosts for URL authorities', () => {
    expect(formatChallengeHost('93.184.216.34')).toBe('93.184.216.34');
    expect(formatChallengeHost('2001:4860:4860::8888')).toBe('[2001:4860:4860::8888]');
  });

  it('requires authentication before resolving or fetching', async () => {
    const response = await callHandler({ customDomain: 'example.com' }, '');

    expect(response.code).toBe(401);
    expect(mockedQueryA).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns forbidden when the kubeconfig cannot access its namespace', async () => {
    mockedGetK8s.mockResolvedValueOnce({
      namespace: 'ns-test',
      k8sCore: {
        listNamespacedService: vi.fn().mockRejectedValue({
          body: {
            code: 403,
            message: 'forbidden'
          }
        })
      }
    } as any);

    const response = await callHandler({ customDomain: 'example.com' }, 'not-a-kubeconfig');

    expect(response.code).toBe(403);
    expect(response.error.code).toBe('FORBIDDEN');
    expect(mockedQueryA).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not report server-side authentication probe failures as unauthorized', async () => {
    mockedGetK8s.mockResolvedValueOnce({
      namespace: 'ns-test',
      k8sCore: {
        listNamespacedService: vi.fn().mockRejectedValue({
          body: {
            code: 500,
            message: 'apiserver unavailable'
          }
        })
      }
    } as any);

    const response = await callHandler({ customDomain: 'example.com' });

    expect(response.code).toBe(500);
    expect(response.error.code).toBe('INTERNAL_ERROR');
    expect(mockedQueryA).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects fragment path-control input before DNS resolution', async () => {
    const response = await callHandler({
      customDomain: 'desktop-frontend.sealos.svc:3000/api/platform/getCloudConfig#'
    });

    expect(response.code).toBe(400);
    expect(response.error.code).toBe('INVALID_CUSTOM_DOMAIN');
    expect(mockedQueryA).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects domains resolving to private addresses', async () => {
    mockedQueryA.mockResolvedValueOnce({
      name: 'example.com',
      type: 'A',
      ttl: 60,
      data: '10.0.0.2'
    });
    mockedQueryAAAA.mockRejectedValueOnce(new Error('no AAAA'));

    const response = await callHandler({ customDomain: 'example.com' });

    expect(response.code).toBe(400);
    expect(response.error.code).toBe('PRIVATE_ADDRESS_NOT_ALLOWED');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects unsafe redirects during challenge fetch', async () => {
    mockedQueryA.mockResolvedValueOnce({
      name: 'example.com',
      type: 'A',
      ttl: 60,
      data: '93.184.216.34'
    });
    mockedQueryAAAA.mockRejectedValueOnce(new Error('no AAAA'));
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: {
          Location: 'http://account-service.account-system.svc:2333/swagger/doc.json'
        }
      })
    );

    const response = await callHandler({ customDomain: 'example.com' });

    expect(response.code).toBe(400);
    expect(response.error.code).toBe('CHALLENGE_REQUEST_FAILED');
    expect(fetch).toHaveBeenCalledWith(
      'http://93.184.216.34/api/.well-known/applaunchpad-domain-challenge/abcdefghijklmnop',
      expect.objectContaining({
        redirect: 'manual',
        headers: expect.objectContaining({
          Host: 'example.com'
        })
      })
    );
  });

  it('allows same-host HTTP to HTTPS challenge redirects', async () => {
    mockedQueryA
      .mockResolvedValueOnce({
        name: 'example.com',
        type: 'A',
        ttl: 60,
        data: '93.184.216.34'
      })
      .mockResolvedValueOnce({
        name: 'example.com',
        type: 'A',
        ttl: 60,
        data: '93.184.216.34'
      });
    mockedQueryAAAA
      .mockRejectedValueOnce(new Error('no AAAA'))
      .mockRejectedValueOnce(new Error('no AAAA'));
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(null, {
          status: 301,
          headers: {
            Location:
              'https://example.com/api/.well-known/applaunchpad-domain-challenge/abcdefghijklmnop'
          }
        })
      )
      .mockResolvedValueOnce(Response.json(createValidChallengeResponse()));
    mockHttpsResponse(createValidChallengeResponse());

    const response = await callHandler({ customDomain: 'example.com' });

    expect(response.code).toBe(200);
    expect(response.data.verified).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(mockedHttpsRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        hostname: '93.184.216.34',
        path: '/api/.well-known/applaunchpad-domain-challenge/abcdefghijklmnop',
        servername: 'example.com',
        headers: expect.objectContaining({
          Host: 'example.com'
        })
      }),
      expect.any(Function)
    );
  });

  it('rejects same-host HTTPS redirects when re-resolution becomes private', async () => {
    mockedQueryA
      .mockResolvedValueOnce({
        name: 'example.com',
        type: 'A',
        ttl: 60,
        data: '93.184.216.34'
      })
      .mockResolvedValueOnce({
        name: 'example.com',
        type: 'A',
        ttl: 60,
        data: '10.0.0.2'
      });
    mockedQueryAAAA
      .mockRejectedValueOnce(new Error('no AAAA'))
      .mockRejectedValueOnce(new Error('no AAAA'));
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, {
        status: 301,
        headers: {
          Location:
            'https://example.com/api/.well-known/applaunchpad-domain-challenge/abcdefghijklmnop'
        }
      })
    );

    const response = await callHandler({ customDomain: 'example.com' });

    expect(response.code).toBe(400);
    expect(response.error.code).toBe('CHALLENGE_REQUEST_FAILED');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects redirects to a different host', async () => {
    mockedQueryA.mockResolvedValueOnce({
      name: 'example.com',
      type: 'A',
      ttl: 60,
      data: '93.184.216.34'
    });
    mockedQueryAAAA.mockRejectedValueOnce(new Error('no AAAA'));
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: {
          Location:
            'https://evil.example/api/.well-known/applaunchpad-domain-challenge/abcdefghijklmnop'
        }
      })
    );

    const response = await callHandler({ customDomain: 'example.com' });

    expect(response.code).toBe(400);
    expect(response.error.code).toBe('CHALLENGE_REQUEST_FAILED');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects redirects that change the challenge path', async () => {
    mockedQueryA.mockResolvedValueOnce({
      name: 'example.com',
      type: 'A',
      ttl: 60,
      data: '93.184.216.34'
    });
    mockedQueryAAAA.mockRejectedValueOnce(new Error('no AAAA'));
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: {
          Location: 'https://example.com/other-path'
        }
      })
    );

    const response = await callHandler({ customDomain: 'example.com' });

    expect(response.code).toBe(400);
    expect(response.error.code).toBe('CHALLENGE_REQUEST_FAILED');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('does not reflect invalid challenge response bodies', async () => {
    mockedQueryA.mockResolvedValueOnce({
      name: 'example.com',
      type: 'A',
      ttl: 60,
      data: '93.184.216.34'
    });
    mockedQueryAAAA.mockRejectedValueOnce(new Error('no AAAA'));
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({
        internal: {
          token: 'should-not-leak'
        }
      })
    );

    const response = await callHandler({ customDomain: 'example.com' });

    expect(response.code).toBe(400);
    expect(response.error.code).toBe('INVALID_CHALLENGE_RESPONSE');
    expect(response.error.response).toBeUndefined();
    expect(JSON.stringify(response)).not.toContain('should-not-leak');
  });

  it('uses bracketed URL authorities for IPv6 challenge targets', async () => {
    mockedQueryA.mockRejectedValueOnce(new Error('no A'));
    mockedQueryAAAA.mockResolvedValueOnce({
      name: 'example.com',
      type: 'AAAA',
      ttl: 60,
      data: '2001:4860:4860::8888'
    });
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({
        internal: {
          token: 'should-not-leak'
        }
      })
    );

    await callHandler({ customDomain: 'example.com' });

    expect(fetch).toHaveBeenCalledWith(
      'http://[2001:4860:4860::8888]/api/.well-known/applaunchpad-domain-challenge/abcdefghijklmnop',
      expect.objectContaining({
        headers: expect.objectContaining({
          Host: 'example.com'
        })
      })
    );
  });

  it('does not expose computed signature material on signature failure', async () => {
    mockedQueryA.mockResolvedValueOnce({
      name: 'example.com',
      type: 'A',
      ttl: 60,
      data: '93.184.216.34'
    });
    mockedQueryAAAA.mockRejectedValueOnce(new Error('no AAAA'));

    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({
        host: 'attacker-controlled.example',
        token: 'abcdefghijklmnop',
        timestamp: Math.floor(Date.now() / 1000),
        service: 'applaunchpad',
        isProxy: false,
        signature: 'invalid-signature'
      })
    );

    const response = await callHandler({ customDomain: 'example.com' });

    expect(response.code).toBe(400);
    expect(response.error.code).toBe('SIGNATURE_VERIFICATION_FAILED');
    expect(response.error.expected).toBeUndefined();
    expect(response.error.signatureData).toBeUndefined();
    expect(JSON.stringify(response)).not.toContain('attacker-controlled.example');
  });

  it('verifies a valid public challenge response', async () => {
    mockedQueryA.mockResolvedValueOnce({
      name: 'example.com',
      type: 'A',
      ttl: 60,
      data: '93.184.216.34'
    });
    mockedQueryAAAA.mockRejectedValueOnce(new Error('no AAAA'));

    vi.mocked(fetch).mockResolvedValueOnce(Response.json(createValidChallengeResponse()));

    const response = await callHandler({ customDomain: 'Example.COM.' });

    expect(response.code).toBe(200);
    expect(response.data).toMatchObject({
      verified: true,
      domain: 'example.com',
      proxy: {
        isProxy: false
      }
    });
  });
});
