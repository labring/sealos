import crypto from 'node:crypto';

const DEFAULT_CANONICAL_URI = '/';
const SIGN_ALGORITHM = 'ACS3-HMAC-SHA256';

/**
 * Supported request methods
 */
export type ACSMethod = 'GET' | 'POST';

/**
 * Supported request body format
 */
export type ACSPayloadFormat = 'json';

/**
 * Authentication config
 */
export type ACSAuthConfig = {
  readonly accessKeyId: string;
  readonly accessKeySecret: string;
  readonly securityToken?: string;
};

/**
 * Request options (simplified, without auth/host/version)
 */
export type ACSRequestInit = {
  readonly method: ACSMethod;
  readonly format?: ACSPayloadFormat;
  readonly action: string;
  readonly uri?: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: unknown;
  readonly param?: unknown;
};

/**
 * Client interface
 */
export type ACSClient = {
  /**
   * Execute a signed request
   */
  readonly fetch: (requestInit: ACSRequestInit) => Promise<Response>;
};

/**
 * Internal request state
 */
type ACSRequestState = {
  readonly method: 'GET' | 'POST';
  readonly host: string;
  readonly uri: string;
  readonly auth: ACSAuthConfig;
  readonly param?: unknown;
  readonly body?: unknown;
  readonly headers: Readonly<Record<string, string>>;
  readonly version: string;
};

/**
 * Convert nested values to a single level map to use in query string
 */
function flattenQueryParams(value: unknown, key: string): Map<string, string> {
  const paramsMap = new Map<string, string>();

  if (typeof value === 'object' && value !== null) {
    for (const [pairKey, pairValue] of Object.entries(value)) {
      // Array index starts at 1...
      const normalizedPairKey = Array.isArray(value) ? (Number(pairKey) + 1).toString() : pairKey;
      // Avoid the leading dot...
      const flatKey = key.length === 0 ? pairKey : `${key}.${normalizedPairKey}`;

      const results = flattenQueryParams(pairValue, flatKey);

      for (const [paramKey, paramValue] of results) {
        paramsMap.set(paramKey, paramValue);
      }
    }
  } else {
    paramsMap.set(`${key}`, String(value));
  }

  return paramsMap;
}

/**
 * Escape util for canonical parts
 */
function escapeCanonicalUri(str: string): string {
  return encodeURIComponent(str).replace(/\+/g, '%20').replace(/\*/g, '%2A').replace(/~/g, '%7E');
}

function sha256Hex(bytes: crypto.BinaryLike): string {
  const hash = crypto.createHash('sha256');
  const digest = hash.update(bytes).digest('hex');
  return digest.toLowerCase();
}

function hmac256(key: crypto.BinaryLike | crypto.KeyObject, data: string): string {
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(data, 'utf8');
  return hmac.digest('hex').toLowerCase();
}

/**
 * Sign and convert to final request
 */
function buildSignedRequest(state: ACSRequestState): Request {
  const encoder = new TextEncoder();

  // Query
  const flatQuery = state.param ? flattenQueryParams(state.param, '') : new Map<string, string>();
  const canonicalQuery = Array.from(flatQuery.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${escapeCanonicalUri(key)}=${escapeCanonicalUri(value)}`)
    .join('&');

  // Body
  let payloadBuffer = encoder.encode('');
  if (state.headers['content-type'] === 'application/json' && state.body) {
    payloadBuffer = encoder.encode(JSON.stringify(state.body));
  }
  const payloadHash = sha256Hex(payloadBuffer);

  // Header
  const normalizedHeaders = Object.fromEntries(
    Object.entries({
      ...state.headers,
      ...(state.auth.securityToken ? { 'x-acs-security-token': state.auth.securityToken } : {}),
      'x-acs-content-sha256': payloadHash
    }).map(([key, value]) => [key.toLowerCase(), value!])
  );

  const sortedHeaderKeys = Object.keys(normalizedHeaders)
    .filter((key) => key.startsWith('x-acs-') || key === 'host' || key === 'content-type')
    .sort();
  const headersToSign = sortedHeaderKeys.join(';');
  const canonicalHeaders =
    sortedHeaderKeys.map((key) => `${key}:${normalizedHeaders[key]}`).join('\n') + '\n';

  // Content to sign
  const canonicalRequest = [
    state.method,
    state.uri,
    canonicalQuery,
    canonicalHeaders,
    headersToSign,
    payloadHash
  ].join('\n');

  const canonicalRequestHash = sha256Hex(encoder.encode(canonicalRequest));
  const stringToSign = `${SIGN_ALGORITHM}\n${canonicalRequestHash}`;

  // Signature
  const signature = hmac256(state.auth.accessKeySecret, stringToSign);
  const authorization = `${SIGN_ALGORITHM} Credential=${state.auth.accessKeyId},SignedHeaders=${headersToSign},Signature=${signature}`;

  // Request
  const baseUrl = `https://${state.host}${state.uri}`;
  const url = canonicalQuery ? `${baseUrl}?${canonicalQuery}` : baseUrl;

  return new Request(url, {
    method: state.method,
    headers: {
      ...normalizedHeaders,
      authorization
    },
    body: payloadBuffer.length > 0 ? payloadBuffer : undefined
  });
}

/**
 * Create request state from client config and request init
 */
function createRequestState(
  auth: ACSAuthConfig,
  host: string,
  version: string,
  requestInit: ACSRequestInit
): ACSRequestState {
  const now = new Date();
  return {
    method: requestInit.method,
    host,
    uri: requestInit.uri ?? DEFAULT_CANONICAL_URI,
    auth,
    param: requestInit.param,
    body: requestInit.body,
    version,
    headers: {
      host,
      // Default to application/json
      'content-type': requestInit.format === 'json' ? 'application/json' : 'application/json',
      'x-acs-action': requestInit.action,
      'x-acs-version': version,
      'x-acs-date': now.toISOString().replace(/\..+/, 'Z'),
      'x-acs-signature-nonce': crypto.randomBytes(16).toString('hex'),
      ...requestInit.headers
    }
  };
}

/**
 * Create ACS client with pre-configured connection info.
 */
export function createClient(config: {
  readonly auth: ACSAuthConfig;
  readonly host: string;
  readonly version: string;
}): ACSClient {
  return {
    fetch: async (requestInit: ACSRequestInit) => {
      const state = createRequestState(config.auth, config.host, config.version, requestInit);
      const request = buildSignedRequest(state);
      return fetch(request);
    }
  };
}
