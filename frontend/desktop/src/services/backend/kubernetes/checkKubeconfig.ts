import { userSystemNamespace } from '@/constants/account';
import { KubeConfig } from '@kubernetes/client-node';
import { request, RequestOptions } from 'node:https';
import { load } from 'js-yaml';
import { z } from 'zod';
import { K8sApiDefault } from './admin';

const kubeconfigSchema = z.object({
  'current-context': z.string(),
  contexts: z.array(
    z.object({ name: z.string(), context: z.object({ cluster: z.string(), user: z.string() }) })
  ),
  clusters: z.array(
    z.object({
      name: z.string(),
      cluster: z.object({ 'certificate-authority-data': z.string().optional() })
    })
  ),
  users: z.array(
    z.object({
      name: z.string(),
      user: z.object({
        token: z.string().optional(),
        'client-certificate-data': z.string().optional(),
        'client-key-data': z.string().optional()
      })
    })
  )
});

type CheckResult = { code: number; message: string };
const unavailable = (): CheckResult => ({
  code: 503,
  message: 'Unable to validate kubeconfig. Please try again.'
});
const invalid = (): CheckResult => ({ code: 401, message: 'Kubeconfig is no longer valid' });

// A failed TLS handshake alone can also mean a broken API server. Only expire
// the session if its CA changed and the user's latest kubeconfig succeeds.
// Token refresh alone does not revoke the old token or establish CA expiry.
const tlsErrors = new Set([
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'CERT_HAS_EXPIRED',
  'CERT_NOT_YET_VALID',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'ERR_SSL_TLSV1_ALERT_UNKNOWN_CA',
  'ERR_SSL_SSLV3_ALERT_BAD_CERTIFICATE',
  'ERR_SSL_SSLV3_ALERT_CERTIFICATE_EXPIRED'
]);

function inlineConfig(raw: string, server: string, tlsServerName?: string) {
  const config = kubeconfigSchema.parse(load(raw));
  const context = config.contexts.find((item) => item.name === config['current-context'])?.context;
  const cluster = config.clusters.find((item) => item.name === context?.cluster)?.cluster;
  const user = config.users.find((item) => item.name === context?.user)?.user;
  if (!context || !cluster || !user) throw new Error('Invalid kubeconfig context');
  if (!user.token && !(user['client-certificate-data'] && user['client-key-data'])) {
    throw new Error('Missing inline credentials');
  }

  // Never load an untrusted config with loadFromString: token-file, exec and
  // auth-provider can read local files or run commands. Whitelist inline data.
  const kc = new KubeConfig();
  kc.loadFromClusterAndUser(
    {
      name: 'session-check',
      server,
      tlsServerName,
      caData: cluster['certificate-authority-data'],
      skipTLSVerify: false
    },
    {
      name: 'session-check',
      token: user.token,
      certData: user['client-certificate-data'],
      keyData: user['client-key-data']
    }
  );
  return kc;
}

async function requestJson(
  kc: KubeConfig,
  path: string,
  payload?: Record<string, string>,
  signal = AbortSignal.timeout(5000)
): Promise<{ statusCode?: number; body: any }> {
  const url = new URL(path, kc.getCurrentCluster()!.server);
  const body = payload ? JSON.stringify(payload) : undefined;
  const options: RequestOptions = {
    method: payload ? 'POST' : 'GET',
    agent: false,
    rejectUnauthorized: true,
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {})
    }
  };
  await kc.applytoHTTPSOptions(options);
  return new Promise((resolve, reject) => {
    const req = request(url, options, (res) => {
      let responseBody = '';
      res.setEncoding('utf8');
      res.on('error', reject);
      res.on('data', (chunk: string) => {
        responseBody += chunk;
        if (responseBody.length > 64 * 1024) req.destroy(new Error('Response too large'));
      });
      res.on('end', () => {
        let parsedBody;
        try {
          parsedBody = JSON.parse(responseBody);
        } catch {
          /* Preserve HTTP status even for non-JSON errors. */
        }
        resolve({ statusCode: res.statusCode, body: parsedBody });
      });
    });
    req.on('error', reject);
    req.end(body);
  });
}

async function whoami(kc: KubeConfig, expectedUser: string): Promise<CheckResult> {
  // Match kubectl's version fallback; all attempts share one timeout signal.
  const signal = AbortSignal.timeout(5000);
  for (const version of ['v1', 'v1beta1', 'v1alpha1']) {
    const { statusCode, body } = await requestJson(
      kc,
      `/apis/authentication.k8s.io/${version}/selfsubjectreviews`,
      { apiVersion: `authentication.k8s.io/${version}`, kind: 'SelfSubjectReview' },
      signal
    );
    if (statusCode === 401) return invalid();
    if (statusCode === 404) continue;
    // Forbidden and server errors do not prove expiry.
    if (statusCode !== 200 && statusCode !== 201) return unavailable();
    const username = body?.status?.userInfo?.username;
    if (typeof username !== 'string' || !username) return unavailable();
    return username === expectedUser ||
      username === `system:serviceaccount:${userSystemNamespace}:${expectedUser}`
      ? { code: 200, message: 'Successfully' }
      : invalid();
  }
  return unavailable();
}

async function latestKubeconfig(expectedUser: string) {
  // Use the same abortable transport as whoami: timing out a Promise alone
  // leaves the underlying admin request connected to an unresponsive server.
  const { statusCode, body } = await requestJson(
    K8sApiDefault(),
    `/apis/user.sealos.io/v1/users/${encodeURIComponent(expectedUser)}`
  );
  return statusCode === 200 ? (body?.status?.kubeConfig as string | undefined) : undefined;
}

export async function checkKubeconfig(raw: string, expectedUser: string): Promise<CheckResult> {
  let trustedCluster;
  try {
    trustedCluster = K8sApiDefault().getCurrentCluster();
    if (!trustedCluster || new URL(trustedCluster.server).protocol !== 'https:')
      return unavailable();
  } catch {
    return unavailable();
  }

  let kc: KubeConfig;
  try {
    kc = inlineConfig(raw, trustedCluster.server, trustedCluster.tlsServerName);
  } catch {
    return { code: 400, message: 'A kubeconfig with inline credentials is required' };
  }

  try {
    return await whoami(kc, expectedUser);
  } catch (error) {
    if (tlsErrors.has((error as NodeJS.ErrnoException).code || '')) {
      try {
        const latest = await latestKubeconfig(expectedUser);
        if (latest) {
          const latestKc = inlineConfig(
            latest,
            trustedCluster.server,
            trustedCluster.tlsServerName
          );
          if (
            Buffer.from(latestKc.getCurrentCluster()?.caData || '', 'base64').toString('hex') !==
              Buffer.from(kc.getCurrentCluster()?.caData || '', 'base64').toString('hex') &&
            (await whoami(latestKc, expectedUser)).code === 200
          ) {
            return invalid();
          }
        }
      } catch {
        // Keep the session when the latest credentials cannot be verified.
      }
    }
    // Do not log transport errors: HTTPS request options contain credentials.
    return unavailable();
  }
}
