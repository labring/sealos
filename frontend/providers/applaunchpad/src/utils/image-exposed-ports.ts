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

const DEFAULT_REGISTRY = 'registry-1.docker.io';
const DOCKER_HUB_AUTH_SERVICE = 'registry.docker.io';
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

  const data = await response.json();
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
              return res.json();
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

  return (await manifestResponse.json()) as RegistryManifest;
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

  const config = await configResponse.json();
  return parseExposedPorts(config?.config?.ExposedPorts);
}
