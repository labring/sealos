import { afterEach, describe, expect, it, vi } from 'vitest';
import { lookup } from 'dns/promises';
import { getImageExposedPorts, parseExposedPorts, parseImageRef } from '@/utils/image-exposed-ports';

vi.mock('dns/promises', () => ({
  lookup: vi.fn()
}));

const lookupMock = vi.mocked(lookup);

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: {
      'content-type': 'application/json',
      ...(init?.headers || {})
    },
    ...init
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  lookupMock.mockReset();
});

describe('parseExposedPorts', () => {
  it('parses, normalizes, deduplicates, and sorts exposed ports', () => {
    expect(
      parseExposedPorts({
        '8080/tcp': {},
        '80/TCP': {},
        '53/udp': {},
        '80/tcp': {},
        '70000/tcp': {},
        bad: {}
      })
    ).toEqual([
      { port: 53, protocol: 'UDP' },
      { port: 80, protocol: 'TCP' },
      { port: 8080, protocol: 'TCP' }
    ]);
  });
});

describe('parseImageRef', () => {
  it('keeps digest references intact and strips optional tags from the repository', () => {
    expect(parseImageRef('nginx:1.27@sha256:abc123')).toEqual({
      registry: 'registry-1.docker.io',
      repository: 'library/nginx',
      reference: 'sha256:abc123'
    });
  });

  it('respects private registry overrides without rewriting repository paths', () => {
    expect(parseImageRef('team/api:1.0.0', 'registry.example.com')).toEqual({
      registry: 'registry.example.com',
      repository: 'team/api',
      reference: '1.0.0'
    });
  });
});

describe('getImageExposedPorts registry safety', () => {
  it('rejects loopback registry hosts before fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(getImageExposedPorts('localhost:5000/team/api:latest')).rejects.toThrow(
      'Registry host is not allowed'
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects registry hosts that resolve to private addresses', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    lookupMock.mockResolvedValue([{ address: '169.254.169.254', family: 4 }]);

    await expect(getImageExposedPorts('registry.example.com/team/api:latest')).rejects.toThrow(
      'Registry host resolves to a private address'
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not forward registry credentials to an untrusted challenge realm', async () => {
    lookupMock.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('', {
        status: 401,
        headers: {
          'www-authenticate':
            'Bearer realm="https://attacker.example/token",service="registry.example.com"'
        }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      getImageExposedPorts('registry.example.com/team/api:latest', {
        username: 'user',
        password: 'password'
      })
    ).rejects.toThrow('Registry auth realm is not trusted');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not fall back to Docker Hub auth for private registry challenges', async () => {
    lookupMock.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('', {
        status: 401,
        headers: {
          'www-authenticate': 'Bearer'
        }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      getImageExposedPorts('registry.example.com/team/api:latest', {
        username: 'user',
        password: 'password'
      })
    ).rejects.toThrow('Registry auth challenge is invalid');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('aborts oversized registry JSON responses', async () => {
    lookupMock.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
    const largeManifest = { manifests: [{ digest: 'sha256:' + 'a'.repeat(1024 * 1024) }] };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(largeManifest));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getImageExposedPorts('registry.example.com/team/api:latest')).rejects.toThrow(
      'Image manifest is too large'
    );
  });

  it('parses exposed ports after trusted registry manifest and config fetches', async () => {
    lookupMock.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ config: { digest: 'sha256:config' } }))
      .mockResolvedValueOnce(
        jsonResponse({
          config: {
            ExposedPorts: {
              '8080/tcp': {},
              '8443/tcp': {}
            }
          }
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(getImageExposedPorts('registry.example.com/team/api:latest')).resolves.toEqual([
      { port: 8080, protocol: 'TCP' },
      { port: 8443, protocol: 'TCP' }
    ]);
  });
});
