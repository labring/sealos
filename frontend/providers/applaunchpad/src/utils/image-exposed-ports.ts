import { lookup } from 'dns/promises';
import { isIP } from 'net';

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
  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('2001:db8:') ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    /^fe[89ab]:/.test(normalized) ||
    normalized.startsWith('ff') ||
    normalized.startsWith('::ffff:127.') ||
    normalized.startsWith('::ffff:10.') ||
    normalized.startsWith('::ffff:192.168.') ||
    /^::ffff:172\.(1[6-9]|2\d|3[01])\./.test(normalized) ||
    /^::ffff:169\.254\./.test(normalized)
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
  const hostIsIp = isIP(host) !== 0;
  if (host === 'localhost' || host.endsWith('.localhost') || (hostIsIp && isBlockedAddress(host))) {
    throw new Error('Registry host is not allowed');
  }

  const addresses = await lookup(host, { all: true });
  if (!addresses.length || addresses.some((item) => isBlockedAddress(item.address))) {
    throw new Error('Registry host resolves to a private address');
  }
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
  response: Response,
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

  const reader = response.body?.getReader();
  if (!reader) {
    return (await response.json()) as T;
  }

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    total += value.byteLength;
    if (total > MAX_REGISTRY_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error(`${context} is too large`);
    }
    chunks.push(value);
  }

  const buffer = Buffer.concat(chunks);
  return JSON.parse(buffer.toString('utf8')) as T;
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

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(REGISTRY_REQUEST_TIMEOUT)
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

async function registryFetch(url: string, image: ImageRef, auth?: ImageRegistryAuth) {
  const headers: Record<string, string> = {
    Accept: ACCEPT_HEADER
  };

  if (auth?.username && auth.password && image.registry !== DEFAULT_REGISTRY) {
    headers.Authorization = `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString(
      'base64'
    )}`;
  }

  let response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(REGISTRY_REQUEST_TIMEOUT)
  });

  if (response.status === 401) {
    const authenticate = response.headers.get('www-authenticate') || '';
    const challenge = parseAuthenticateHeader(authenticate);
    assertTrustedRealm(challenge, image);
    const token =
      challenge.realm && challenge.service
        ? await fetch(
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
              signal: AbortSignal.timeout(REGISTRY_REQUEST_TIMEOUT)
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

    response = await fetch(url, {
      headers: {
        ...headers,
        Authorization: `Bearer ${token}`
      },
      signal: AbortSignal.timeout(REGISTRY_REQUEST_TIMEOUT)
    });
  }

  return response;
}

async function fetchManifest(image: ImageRef, reference: string, auth?: ImageRegistryAuth) {
  const manifestUrl = toRegistryUrl(
    image.registry,
    `/v2/${image.repository}/manifests/${reference}`
  );
  const manifestResponse = await registryFetch(manifestUrl, image, auth);

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
  const configResponse = await registryFetch(configUrl, image, auth);

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
