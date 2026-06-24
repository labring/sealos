import { lookup } from 'dns/promises';
import { request as httpRequest } from 'http';
import type { IncomingHttpHeaders, IncomingMessage, RequestOptions } from 'http';
import { request as httpsRequest } from 'https';
import { isIP } from 'net';
import type { LookupFunction } from 'net';

export type ImageRegistryAuth = {
  username?: string;
  password?: string;
  serverAddress?: string;
};

export type ImageExposedPort = {
  port: number;
  protocol: 'TCP' | 'UDP' | 'SCTP';
};

type ImageRef = {
  registry: string;
  repository: string;
  reference: string;
};

type RegistryManifest = {
  mediaType?: string;
  config?: {
    digest?: string;
  };
  manifests?: {
    digest?: string;
    platform?: {
      architecture?: string;
      os?: string;
      variant?: string;
    };
  }[];
};

type ChallengeParams = {
  realm?: string;
  service?: string;
  scope?: string;
};

type RegistryResponse = {
  ok: boolean;
  status: number;
  headers: {
    get: (name: string) => string | null;
  };
  json: () => Promise<unknown>;
};

const DEFAULT_REGISTRY = 'registry-1.docker.io';
const DOCKER_HUB_AUTH_SERVICE = 'registry.docker.io';
const DOCKER_HUB_AUTH_HOST = 'auth.docker.io';
const DOCKER_HUB_REGISTRY_ALIASES = new Set([
  'docker.io',
  'index.docker.io',
  'registry.hub.docker.com',
  DEFAULT_REGISTRY
]);
const ACCEPT_HEADER = [
  'application/vnd.oci.image.index.v1+json',
  'application/vnd.docker.distribution.manifest.list.v2+json',
  'application/vnd.oci.image.manifest.v1+json',
  'application/vnd.docker.distribution.manifest.v2+json',
  'application/vnd.docker.distribution.manifest.v1+json'
].join(', ');
const REGISTRY_REQUEST_TIMEOUT = 10000;
const MAX_REGISTRY_RESPONSE_BYTES = 1024 * 1024;
const MAX_REGISTRY_REDIRECTS = 3;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const JSON_CONTENT_TYPES = new Set([
  'application/json',
  'application/vnd.oci.image.index.v1+json',
  'application/vnd.docker.distribution.manifest.list.v2+json',
  'application/vnd.oci.image.manifest.v1+json',
  'application/vnd.docker.distribution.manifest.v2+json',
  'application/vnd.docker.distribution.manifest.v1+json',
  'application/vnd.oci.image.config.v1+json',
  'application/vnd.docker.container.image.v1+json'
]);
const OCTET_STREAM_CONTENT_TYPE = 'application/octet-stream';

function isBlockedIPv4(address: string) {
  const parts = address.split('.').map((part) => Number(part));
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return true;
  }

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 192 && b === 0 && parts[2] === 0) ||
    (a === 192 && b === 0 && parts[2] === 2) ||
    (a === 198 && b === 51 && parts[2] === 100) ||
    (a === 203 && b === 0 && parts[2] === 113) ||
    a >= 224
  );
}

function isBlockedIPv6(address: string) {
  const normalized = address.toLowerCase();
  const ipv4Mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (ipv4Mapped) {
    return isBlockedIPv4(ipv4Mapped[1]);
  }

  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('2001:db8:') ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    /^fe[89ab][0-9a-f]:/.test(normalized) ||
    normalized.startsWith('ff')
  );
}

function isBlockedAddress(address: string) {
  const ipVersion = isIP(address);
  if (ipVersion === 4) return isBlockedIPv4(address);
  if (ipVersion === 6) return isBlockedIPv6(address);
  return true;
}

function getUrlHost(value: string) {
  const url = new URL(
    value.startsWith('http://') || value.startsWith('https://') ? value : `https://${value}`
  );
  return url.hostname.replace(/^\[|\]$/g, '');
}

async function assertPublicRegistryHost(registry: string) {
  const host = getUrlHost(registry);
  await assertPublicHost(host, 'Registry host');
}

async function assertPublicHost(host: string, context: string) {
  const hostIsIp = isIP(host) !== 0;
  if (host === 'localhost' || host.endsWith('.localhost') || (hostIsIp && isBlockedAddress(host))) {
    throw new Error(`${context} is not allowed`);
  }

  if (hostIsIp) {
    return;
  }

  const addresses = await lookup(host, { all: true });
  if (!addresses.length || addresses.some((item) => isBlockedAddress(item.address))) {
    throw new Error(`${context} resolves to a private address`);
  }
}

function assertRegistryUrl(url: URL) {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Registry request protocol is not allowed');
  }
}

const publicLookup: LookupFunction = (hostname, options, callback) => {
  const lookupOptions = {
    family: options.family,
    hints: options.hints,
    verbatim: options.verbatim
  };

  const hostIsIp = isIP(hostname) !== 0;
  if (hostIsIp) {
    if (isBlockedAddress(hostname)) {
      callback(
        Object.assign(new Error('Registry host is not allowed'), { code: 'EHOSTDENIED' }),
        '',
        0
      );
      return;
    }

    callback(null, hostname, isIP(hostname));
    return;
  }

  lookup(hostname, { ...lookupOptions, all: true })
    .then((addresses) => {
      if (!addresses.length || addresses.some((item) => isBlockedAddress(item.address))) {
        callback(
          Object.assign(new Error('Registry host resolves to a private address'), {
            code: 'EHOSTDENIED'
          }),
          '',
          0
        );
        return;
      }

      const preferredFamily =
        lookupOptions.family === 4 || lookupOptions.family === 6 ? lookupOptions.family : undefined;
      const selected = preferredFamily
        ? addresses.find((item) => item.family === preferredFamily)
        : addresses[0];

      if (!selected) {
        callback(
          Object.assign(new Error('Registry host address family is unavailable'), {
            code: 'ENOTFOUND'
          }),
          '',
          0
        );
        return;
      }

      callback(null, selected.address, selected.family);
    })
    .catch((error) => {
      callback(error, '', 0);
    });
};

function getHeader(headers: IncomingHttpHeaders, name: string) {
  const value = headers[name.toLowerCase()];
  if (Array.isArray(value)) return value.join(', ');
  return value ?? null;
}

function createRegistryResponse(message: IncomingMessage, body: Buffer): RegistryResponse {
  const status = message.statusCode || 0;
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name) => getHeader(message.headers, name)
    },
    json: async () => JSON.parse(body.toString('utf8'))
  };
}

async function readRegistryResponseBody(message: IncomingMessage, context: string) {
  return await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let settled = false;

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    message.on('data', (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buffer.byteLength;
      if (total > MAX_REGISTRY_RESPONSE_BYTES) {
        message.destroy();
        fail(new Error(`${context} is too large`));
        return;
      }
      chunks.push(buffer);
    });
    message.on('error', fail);
    message.on('end', () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks));
    });
  });
}

async function requestRegistryUrl(
  url: URL,
  options: { headers?: Record<string, string>; signal?: AbortSignal; context: string }
) {
  assertRegistryUrl(url);
  await assertPublicHost(url.hostname, 'Registry host');

  const request = url.protocol === 'https:' ? httpsRequest : httpRequest;
  const requestOptions: RequestOptions = {
    method: 'GET',
    headers: options.headers,
    lookup: publicLookup,
    signal: options.signal
  };

  return await new Promise<RegistryResponse>((resolve, reject) => {
    const req = request(url, requestOptions, async (message) => {
      try {
        const body = await readRegistryResponseBody(message, options.context);
        resolve(createRegistryResponse(message, body));
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
    req.end();
  });
}

function stripRedirectHeaders(headers: Record<string, string> | undefined, from: URL, to: URL) {
  if (from.origin === to.origin) return headers;
  if (!headers) return headers;

  const nextHeaders = { ...headers };
  delete nextHeaders.Authorization;
  delete nextHeaders.authorization;
  return nextHeaders;
}

async function registryHttpRequest(
  url: string,
  options: { headers?: Record<string, string>; signal?: AbortSignal; context: string },
  redirectCount = 0
): Promise<RegistryResponse> {
  const currentUrl = new URL(url);
  const response = await requestRegistryUrl(currentUrl, options);

  if (!REDIRECT_STATUSES.has(response.status)) {
    return response;
  }

  if (redirectCount >= MAX_REGISTRY_REDIRECTS) {
    throw new Error('Registry request redirected too many times');
  }

  const location = response.headers.get('location');
  if (!location) {
    throw new Error('Registry request redirect is invalid');
  }

  const redirectUrl = new URL(location, currentUrl);
  assertRegistryUrl(redirectUrl);
  if (currentUrl.protocol === 'https:' && redirectUrl.protocol !== 'https:') {
    throw new Error('Registry request redirect is not trusted');
  }

  await assertPublicHost(redirectUrl.hostname, 'Registry host');

  return await registryHttpRequest(
    redirectUrl.toString(),
    {
      ...options,
      headers: stripRedirectHeaders(options.headers, currentUrl, redirectUrl)
    },
    redirectCount + 1
  );
}

function assertTrustedRealm(challenge: ChallengeParams, image: ImageRef) {
  if (!challenge.realm) return;

  let realmUrl: URL;
  try {
    realmUrl = new URL(challenge.realm);
  } catch {
    throw new Error('Registry auth realm is invalid');
  }

  if (realmUrl.protocol !== 'https:') {
    throw new Error('Registry auth realm is not trusted');
  }

  const registryHost = getUrlHost(image.registry);
  const allowedHosts =
    image.registry === DEFAULT_REGISTRY ? new Set([DOCKER_HUB_AUTH_HOST]) : new Set([registryHost]);

  if (!allowedHosts.has(realmUrl.hostname)) {
    throw new Error('Registry auth realm is not trusted');
  }
}

async function readJsonResponse<T>(
  response: RegistryResponse,
  context: string,
  options?: { allowOctetStream?: boolean }
): Promise<T> {
  const contentType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  const contentTypeAllowed =
    contentType &&
    (JSON_CONTENT_TYPES.has(contentType) ||
      (options?.allowOctetStream && contentType === OCTET_STREAM_CONTENT_TYPE));
  if (contentType && !contentTypeAllowed) {
    throw new Error(`${context} returned unsupported content type`);
  }

  return (await response.json()) as T;
}

function normalizeRegistry(registry?: string) {
  const normalized = registry?.replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!normalized) return DEFAULT_REGISTRY;
  return DOCKER_HUB_REGISTRY_ALIASES.has(normalized) ? DEFAULT_REGISTRY : normalized;
}

export function parseImageRef(imageName: string, registryOverride?: string): ImageRef {
  const trimmed = imageName.trim();
  const [namePart, digest] = trimmed.split('@');
  const tagIndex = namePart.lastIndexOf(':');
  const slashIndex = namePart.indexOf('/');
  const hasExplicitTag = tagIndex > slashIndex;
  const reference = digest || (hasExplicitTag ? namePart.slice(tagIndex + 1) : 'latest');
  const withoutTag = hasExplicitTag ? namePart.slice(0, tagIndex) : namePart;
  const segments = withoutTag.split('/').filter(Boolean);
  const first = segments[0] || '';
  const hasRegistry = first.includes('.') || first.includes(':') || first === 'localhost';
  const registry = registryOverride
    ? normalizeRegistry(registryOverride)
    : hasRegistry
      ? normalizeRegistry(first)
      : DEFAULT_REGISTRY;
  let repositorySegments = hasRegistry ? segments.slice(1) : segments;
  if (registryOverride && !hasRegistry && segments.length > 1) {
    repositorySegments = segments;
  }
  const repository =
    registry === DEFAULT_REGISTRY && repositorySegments.length === 1
      ? `library/${repositorySegments[0]}`
      : repositorySegments.join('/');

  if (!repository) {
    throw new Error('Invalid image name');
  }

  return { registry, repository, reference };
}

function toRegistryUrl(registry: string, path: string) {
  const base =
    registry.startsWith('http://') || registry.startsWith('https://')
      ? registry
      : `https://${registry}`;
  return `${base.replace(/\/$/, '')}${path}`;
}

function parseAuthenticateHeader(header: string) {
  const params: Record<string, string> = {};
  const challenge = header.replace(/^Bearer\s+/i, '');
  challenge.replace(/(\w+)="([^"]*)"/g, (_, key, value) => {
    params[key] = value;
    return '';
  });
  return params;
}

async function getBearerToken(image: ImageRef, auth?: ImageRegistryAuth) {
  if (image.registry !== DEFAULT_REGISTRY) {
    throw new Error('Registry auth challenge is invalid');
  }

  const service = image.registry === DEFAULT_REGISTRY ? DOCKER_HUB_AUTH_SERVICE : image.registry;
  const realm = 'https://auth.docker.io/token';
  const url = `${realm}?service=${encodeURIComponent(service)}&scope=${encodeURIComponent(
    `repository:${image.repository}:pull`
  )}`;
  const headers: Record<string, string> = {};

  if (auth?.username && auth.password) {
    headers.Authorization = `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString(
      'base64'
    )}`;
  }

  const response = await registryHttpRequest(url, {
    headers,
    signal: AbortSignal.timeout(REGISTRY_REQUEST_TIMEOUT),
    context: 'Registry auth response'
  });
  if (!response.ok) {
    throw new Error(`Registry auth failed: ${response.status}`);
  }

  const data = await readJsonResponse<{ token?: string; access_token?: string }>(
    response,
    'Registry auth response'
  );
  return data.token || data.access_token;
}

async function registryFetch(
  url: string,
  image: ImageRef,
  auth?: ImageRegistryAuth,
  context = 'Registry response'
) {
  const headers: Record<string, string> = {
    Accept: ACCEPT_HEADER
  };

  if (auth?.username && auth.password && image.registry !== DEFAULT_REGISTRY) {
    headers.Authorization = `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString(
      'base64'
    )}`;
  }

  let response = await registryHttpRequest(url, {
    headers,
    signal: AbortSignal.timeout(REGISTRY_REQUEST_TIMEOUT),
    context
  });

  if (response.status === 401) {
    const authenticate = response.headers.get('www-authenticate') || '';
    const challenge = parseAuthenticateHeader(authenticate);
    assertTrustedRealm(challenge, image);
    const token =
      challenge.realm && challenge.service
        ? await registryHttpRequest(
            `${challenge.realm}?service=${encodeURIComponent(
              challenge.service
            )}&scope=${encodeURIComponent(
              challenge.scope || `repository:${image.repository}:pull`
            )}`,
            {
              headers:
                auth?.username && auth.password
                  ? {
                      Authorization: `Basic ${Buffer.from(
                        `${auth.username}:${auth.password}`
                      ).toString('base64')}`
                    }
                  : undefined,
              signal: AbortSignal.timeout(REGISTRY_REQUEST_TIMEOUT),
              context: 'Registry auth response'
            }
          )
            .then((res) => {
              if (!res.ok) throw new Error(`Registry auth failed: ${res.status}`);
              return readJsonResponse<{ token?: string; access_token?: string }>(
                res,
                'Registry auth response'
              );
            })
            .then((data) => data.token || data.access_token)
        : await getBearerToken(image, auth);

    response = await registryHttpRequest(url, {
      headers: {
        ...headers,
        Authorization: `Bearer ${token}`
      },
      signal: AbortSignal.timeout(REGISTRY_REQUEST_TIMEOUT),
      context
    });
  }

  return response;
}

async function fetchManifest(image: ImageRef, reference: string, auth?: ImageRegistryAuth) {
  const manifestUrl = toRegistryUrl(
    image.registry,
    `/v2/${image.repository}/manifests/${reference}`
  );
  const manifestResponse = await registryFetch(manifestUrl, image, auth, 'Image manifest');

  if (!manifestResponse.ok) {
    throw new Error(`Failed to fetch image manifest: ${manifestResponse.status}`);
  }

  return await readJsonResponse<RegistryManifest>(manifestResponse, 'Image manifest');
}

function selectManifestDigest(manifest: RegistryManifest) {
  const manifests = manifest.manifests || [];
  const linuxAmd64 = manifests.find(
    (item) => item.platform?.os === 'linux' && item.platform?.architecture === 'amd64'
  );
  const linux = manifests.find((item) => item.platform?.os === 'linux');
  return linuxAmd64?.digest || linux?.digest || manifests[0]?.digest;
}

export function parseExposedPorts(exposedPorts?: Record<string, unknown>): ImageExposedPort[] {
  if (!exposedPorts) return [];

  const ports = Object.keys(exposedPorts)
    .map((key) => {
      const [port, protocol = 'tcp'] = key.split('/');
      const parsedPort = Number(port);
      const parsedProtocol = protocol.toUpperCase();

      if (
        !Number.isInteger(parsedPort) ||
        parsedPort < 1 ||
        parsedPort > 65535 ||
        !['TCP', 'UDP', 'SCTP'].includes(parsedProtocol)
      ) {
        return null;
      }

      return {
        port: parsedPort,
        protocol: parsedProtocol as ImageExposedPort['protocol']
      };
    })
    .filter((item): item is ImageExposedPort => item !== null);

  return [...new Map(ports.map((item) => [`${item.port}/${item.protocol}`, item])).values()].sort(
    (a, b) => a.port - b.port || a.protocol.localeCompare(b.protocol)
  );
}

export async function getImageExposedPorts(
  imageName: string,
  auth?: ImageRegistryAuth
): Promise<ImageExposedPort[]> {
  const image = parseImageRef(imageName, auth?.serverAddress);
  await assertPublicRegistryHost(image.registry);
  let manifest = await fetchManifest(image, image.reference, auth);
  const platformManifestDigest = selectManifestDigest(manifest);
  if (!manifest.config?.digest && platformManifestDigest) {
    manifest = await fetchManifest(image, platformManifestDigest, auth);
  }
  const configDigest = manifest.config?.digest;

  if (!configDigest) {
    return [];
  }

  const configUrl = toRegistryUrl(image.registry, `/v2/${image.repository}/blobs/${configDigest}`);
  const configResponse = await registryFetch(configUrl, image, auth, 'Image config');

  if (!configResponse.ok) {
    throw new Error(`Failed to fetch image config: ${configResponse.status}`);
  }

  const config = await readJsonResponse<{ config?: { ExposedPorts?: Record<string, unknown> } }>(
    configResponse,
    'Image config',
    { allowOctetStream: true }
  );
  return parseExposedPorts(config?.config?.ExposedPorts);
}
