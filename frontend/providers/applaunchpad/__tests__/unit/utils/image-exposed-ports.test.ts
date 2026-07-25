import { afterEach, describe, expect, it, vi } from 'vitest';
import { lookup } from 'dns/promises';
import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';
import { EventEmitter } from 'events';
import { Readable } from 'stream';
import type { IncomingMessage, RequestOptions } from 'http';
import { getImageExposedPorts, parseExposedPorts, parseImageRef } from '@/utils/image-exposed-ports';

vi.mock('dns/promises', () => ({
  lookup: vi.fn()
}));

vi.mock('http', () => ({
  request: vi.fn()
}));

vi.mock('https', () => ({
  request: vi.fn()
}));

const lookupMock = vi.mocked(lookup);
const httpRequestMock = vi.mocked(httpRequest);
const httpsRequestMock = vi.mocked(httpsRequest);

type MockRegistryResponse = {
  body?: unknown;
  headers?: Record<string, string>;
  status?: number;
};

type MockRequestCall = {
  url: URL;
  options: RequestOptions;
};

const requestCalls: MockRequestCall[] = [];
const lookupCallbackAddresses: unknown[] = [];
let connectionLookupOptions: Record<string, unknown> = {};

function createResponse(response: MockRegistryResponse) {
  const body =
    typeof response.body === 'string'
      ? response.body
      : JSON.stringify(response.body ?? {});
  const stream = Readable.from([body]) as IncomingMessage;
  stream.statusCode = response.status ?? 200;
  stream.headers = {
    'content-type': 'application/json',
    ...(response.headers || {})
  };
  return stream;
}

function createRequestMock(responses: MockRegistryResponse[]) {
  return vi.fn((url: string | URL, options: RequestOptions, callback: (res: IncomingMessage) => void) => {
    const request = new EventEmitter() as EventEmitter & { end: () => void };
    const parsedUrl = typeof url === 'string' ? new URL(url) : url;
    requestCalls.push({ url: parsedUrl, options });

    request.end = () => {
      const lookupFn = options.lookup;
      const finish = () => {
        const response = responses.shift();
        if (!response) {
          request.emit('error', new Error(`Unexpected request to ${parsedUrl.toString()}`));
          return;
        }
        callback(createResponse(response));
      };

      if (!lookupFn) {
        finish();
        return;
      }

      lookupFn(parsedUrl.hostname, connectionLookupOptions as any, (error, address) => {
        lookupCallbackAddresses.push(address);
        if (error) {
          request.emit('error', error);
          return;
        }
        finish();
      });
    };
    return request;
  });
}

function mockRegistryRequests(...responses: MockRegistryResponse[]) {
  const requestMock = createRequestMock([...responses]);
  httpRequestMock.mockImplementation(requestMock);
  httpsRequestMock.mockImplementation(requestMock);
  return requestMock;
}

afterEach(() => {
  vi.clearAllMocks();
  lookupMock.mockReset();
  requestCalls.length = 0;
  lookupCallbackAddresses.length = 0;
  connectionLookupOptions = {};
  delete (globalThis as any).AppConfig;
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
    const requestMock = mockRegistryRequests();

    await expect(getImageExposedPorts('localhost:5000/team/api:latest')).rejects.toThrow(
      'Registry host is not allowed'
    );
    expect(requestMock).not.toHaveBeenCalled();
  });

  it('rejects registry hosts that resolve to private addresses', async () => {
    const requestMock = mockRegistryRequests();
    lookupMock.mockResolvedValue([{ address: '169.254.169.254', family: 4 }]);

    await expect(getImageExposedPorts('registry.example.com/team/api:latest')).rejects.toThrow(
      'Registry host resolves to a private address'
    );
    expect(requestMock).not.toHaveBeenCalled();
  });

  it('rejects registry redirects to private addresses', async () => {
    lookupMock
      .mockResolvedValueOnce([{ address: '8.8.8.8', family: 4 }])
      .mockResolvedValueOnce([{ address: '8.8.8.8', family: 4 }])
      .mockResolvedValueOnce([{ address: '8.8.8.8', family: 4 }])
      .mockResolvedValueOnce([{ address: '169.254.169.254', family: 4 }]);
    const requestMock = mockRegistryRequests({
      status: 302,
      headers: {
        location: 'https://metadata.example/latest/meta-data'
      }
    });

    await expect(getImageExposedPorts('registry.example.com/team/api:latest')).rejects.toThrow(
      'Registry host resolves to a private address'
    );
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestCalls[0].url.toString()).toBe(
      'https://registry.example.com/v2/team/api/manifests/latest'
    );
  });

  it('rejects DNS rebinding during the connection lookup', async () => {
    lookupMock
      .mockResolvedValueOnce([{ address: '8.8.8.8', family: 4 }])
      .mockResolvedValueOnce([{ address: '8.8.8.8', family: 4 }])
      .mockResolvedValueOnce([{ address: '10.0.0.8', family: 4 }]);
    const requestMock = mockRegistryRequests({ body: { config: { digest: 'sha256:config' } } });

    await expect(getImageExposedPorts('registry.example.com/team/api:latest')).rejects.toThrow(
      'Registry host resolves to a private address'
    );
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it('returns lookup address arrays when Node requests all connection addresses', async () => {
    connectionLookupOptions = { all: true };
    lookupMock.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
    mockRegistryRequests(
      { body: { config: { digest: 'sha256:config' } } },
      {
        body: {
          config: {
            ExposedPorts: {
              '80/tcp': {}
            }
          }
        }
      }
    );

    await expect(getImageExposedPorts('registry.example.com/team/api:latest')).resolves.toEqual([
      { port: 80, protocol: 'TCP' }
    ]);
    expect(lookupCallbackAddresses).toHaveLength(2);
    expect(lookupCallbackAddresses.every(Array.isArray)).toBe(true);
  });

  it('allows configured trusted registry hosts to resolve to private addresses', async () => {
    (globalThis as any).AppConfig = {
      launchpad: {
        imagePorts: {
          trustedRegistries: ['https://registry.192.168.10.70.nip.io']
        }
      }
    };
    lookupMock.mockResolvedValue([{ address: '192.168.10.70', family: 4 }]);
    mockRegistryRequests(
      { body: { config: { digest: 'sha256:config' } } },
      {
        body: {
          config: {
            ExposedPorts: {
              '80/tcp': {}
            }
          }
        }
      }
    );

    await expect(
      getImageExposedPorts('registry.192.168.10.70.nip.io/team/api:latest')
    ).resolves.toEqual([{ port: 80, protocol: 'TCP' }]);
  });

  it('allows auth realms on configured trusted registry hosts', async () => {
    (globalThis as any).AppConfig = {
      launchpad: {
        imagePorts: {
          trustedRegistries: [
            'registry.192.168.10.70.nip.io',
            'hub.192.168.10.70.nip.io'
          ]
        }
      }
    };
    lookupMock.mockResolvedValue([{ address: '192.168.10.70', family: 4 }]);
    mockRegistryRequests(
      {
        status: 401,
        body: '',
        headers: {
          'www-authenticate':
            'Bearer realm="https://hub.192.168.10.70.nip.io/token",service="registry.192.168.10.70.nip.io"'
        }
      },
      { body: { token: 'trusted-token' } },
      { body: { config: { digest: 'sha256:config' } } },
      {
        body: {
          config: {
            ExposedPorts: {
              '5000/tcp': {}
            }
          }
        }
      }
    );

    await expect(
      getImageExposedPorts('registry.192.168.10.70.nip.io/team/api:latest', {
        username: 'user',
        password: 'password'
      })
    ).resolves.toEqual([{ port: 5000, protocol: 'TCP' }]);
    expect(requestCalls[1].url.hostname).toBe('hub.192.168.10.70.nip.io');
  });

  it('does not forward registry credentials to an untrusted challenge realm', async () => {
    lookupMock.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
    const requestMock = mockRegistryRequests({
      status: 401,
      body: '',
      headers: {
        'www-authenticate':
          'Bearer realm="https://attacker.example/token",service="registry.example.com"'
      }
    });

    await expect(
      getImageExposedPorts('registry.example.com/team/api:latest', {
        username: 'user',
        password: 'password'
      })
    ).rejects.toThrow('Registry auth realm is not trusted');
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it('does not trust configured internal auth realms for unrelated public registries', async () => {
    (globalThis as any).AppConfig = {
      launchpad: {
        imagePorts: {
          trustedRegistries: ['hub.192.168.10.70.nip.io']
        }
      }
    };
    lookupMock.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
    const requestMock = mockRegistryRequests({
      status: 401,
      body: '',
      headers: {
        'www-authenticate':
          'Bearer realm="https://hub.192.168.10.70.nip.io/token",service="registry.example.com"'
      }
    });

    await expect(
      getImageExposedPorts('registry.example.com/team/api:latest', {
        username: 'user',
        password: 'password'
      })
    ).rejects.toThrow('Registry auth realm is not trusted');
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it('does not fall back to Docker Hub auth for private registry challenges', async () => {
    lookupMock.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
    const requestMock = mockRegistryRequests({
      status: 401,
      body: '',
      headers: {
        'www-authenticate': 'Bearer'
      }
    });

    await expect(
      getImageExposedPorts('registry.example.com/team/api:latest', {
        username: 'user',
        password: 'password'
      })
    ).rejects.toThrow('Registry auth challenge is invalid');
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it('aborts oversized registry JSON responses', async () => {
    lookupMock.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
    const largeManifest = { manifests: [{ digest: 'sha256:' + 'a'.repeat(1024 * 1024) }] };
    mockRegistryRequests({ body: largeManifest });

    await expect(getImageExposedPorts('registry.example.com/team/api:latest')).rejects.toThrow(
      'Image manifest is too large'
    );
  });

  it('parses exposed ports after trusted registry manifest and config fetches', async () => {
    lookupMock.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
    mockRegistryRequests(
      { body: { config: { digest: 'sha256:config' } } },
      {
        body: {
          config: {
            ExposedPorts: {
              '8080/tcp': {},
              '8443/tcp': {}
            }
          }
        }
      }
    );

    await expect(getImageExposedPorts('registry.example.com/team/api:latest')).resolves.toEqual([
      { port: 8080, protocol: 'TCP' },
      { port: 8443, protocol: 'TCP' }
    ]);
  });
});
