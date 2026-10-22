import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { httpsRequest } = vi.hoisted(() => ({ httpsRequest: vi.fn() }));
vi.mock('node:https', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:https')>()),
  request: httpsRequest
}));
vi.mock('@/services/backend/kubernetes/admin', async () => {
  const { KubeConfig } = await import('@kubernetes/client-node');
  return {
    K8sApiDefault: () => {
      const kc = new KubeConfig();
      kc.loadFromClusterAndUser(
        { name: 'admin', server: 'https://apiserver.cluster.local:6443', skipTLSVerify: false },
        { name: 'admin', token: 'admin-token' }
      );
      return kc;
    }
  };
});

import { checkKubeconfig } from '@/services/backend/kubernetes/checkKubeconfig';

const kubeconfig = (user: Record<string, unknown> = { token: 'old-token' }, ca = 'b2xkLWNh') =>
  JSON.stringify({
    'current-context': 'alice',
    contexts: [
      { name: 'alice', context: { user: 'alice', cluster: 'cluster', namespace: 'ns-a' } }
    ],
    clusters: [
      {
        name: 'cluster',
        cluster: {
          server: 'https://untrusted.example.com',
          'certificate-authority-data': ca,
          'insecure-skip-tls-verify': true,
          'certificate-authority': '/server-private-ca'
        }
      }
    ],
    users: [{ name: 'alice', user }]
  });
const identity = (username = 'alice') => ({ status: { userInfo: { username } } });

function respond(statusCode: number, body: unknown = {}) {
  httpsRequest.mockImplementationOnce((_url, _options, callback) => {
    const req = new EventEmitter() as any;
    req.destroy = vi.fn((error) => req.emit('error', error));
    req.end = vi.fn(() => {
      const res = new EventEmitter() as any;
      res.statusCode = statusCode;
      res.setEncoding = vi.fn();
      callback(res);
      res.emit('data', JSON.stringify(body));
      res.emit('end');
    });
    return req;
  });
}

function fail(code: string) {
  httpsRequest.mockImplementationOnce(() => {
    const req = new EventEmitter() as any;
    req.end = () => req.emit('error', Object.assign(new Error('Transport error'), { code }));
    return req;
  });
}

describe('SelfSubjectReview using the browser kubeconfig', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it.each(['alice', 'system:serviceaccount:user-system:alice'])('accepts %s', async (username) => {
    respond(201, identity(username));
    expect((await checkKubeconfig(kubeconfig(), 'alice')).code).toBe(200);
  });

  it('uses only inline browser credentials against the trusted cluster with TLS verification', async () => {
    respond(201, identity());
    await checkKubeconfig(
      kubeconfig({
        token: 'old-token',
        'token-file': '/server-secret',
        'client-certificate': '/server-cert',
        'client-key': '/server-key',
        exec: { command: 'must-never-run' },
        'auth-provider': { name: 'must-never-run' },
        impersonate: 'admin'
      }),
      'alice'
    );
    const [url, options] = httpsRequest.mock.calls[0];
    expect(String(url)).toBe(
      'https://apiserver.cluster.local:6443/apis/authentication.k8s.io/v1/selfsubjectreviews'
    );
    expect(options.rejectUnauthorized).toBe(true);
    expect(options.headers.Authorization).toBe('Bearer old-token');
    expect(options.ca).toEqual(Buffer.from('old-ca'));
    expect(options.cert).toBeUndefined();
    expect(options.key).toBeUndefined();
    expect(httpsRequest).toHaveBeenCalledTimes(1);
    const req = httpsRequest.mock.results[0].value;
    expect(JSON.parse(req.end.mock.calls[0][0])).toEqual({
      apiVersion: 'authentication.k8s.io/v1',
      kind: 'SelfSubjectReview'
    });
  });

  it('supports inline client certificates', async () => {
    respond(201, identity());
    const result = await checkKubeconfig(
      kubeconfig({
        'client-certificate-data': Buffer.from('client-cert').toString('base64'),
        'client-key-data': Buffer.from('client-key').toString('base64')
      }),
      'alice'
    );
    expect(result.code).toBe(200);
    const options = httpsRequest.mock.calls[0][1];
    expect(options.cert).toEqual(Buffer.from('client-cert'));
    expect(options.key).toEqual(Buffer.from('client-key'));
  });

  it('expires revoked credentials on 401 without fetching replacement credentials', async () => {
    respond(401);
    expect((await checkKubeconfig(kubeconfig(), 'alice')).code).toBe(401);
    expect(httpsRequest).toHaveBeenCalledTimes(1);
  });

  it.each(['system:anonymous', 'bob', 'system:serviceaccount:other:alice'])(
    'rejects unexpected identity %s',
    async (username) => {
      respond(201, identity(username));
      expect((await checkKubeconfig(kubeconfig(), 'alice')).code).toBe(401);
    }
  );

  it.each([403, 500, 503])('preserves sessions on API status %s', async (status) => {
    respond(status);
    expect((await checkKubeconfig(kubeconfig(), 'alice')).code).toBe(503);
  });

  it.each(['v1beta1', 'v1alpha1'])('falls back to %s on older clusters', async (version) => {
    respond(404);
    if (version === 'v1alpha1') respond(404);
    respond(201, identity());
    expect((await checkKubeconfig(kubeconfig(), 'alice')).code).toBe(200);
    const last = httpsRequest.mock.calls.length - 1;
    expect(String(httpsRequest.mock.calls[last][0])).toContain(`/${version}/selfsubjectreviews`);
    expect(httpsRequest.mock.calls[last][1].signal).toBe(httpsRequest.mock.calls[0][1].signal);
    expect(JSON.parse(httpsRequest.mock.results[last].value.end.mock.calls[0][0]).apiVersion).toBe(
      `authentication.k8s.io/${version}`
    );
  });

  it('preserves sessions if no SelfSubjectReview version is available', async () => {
    respond(404);
    respond(404);
    respond(404);
    expect((await checkKubeconfig(kubeconfig(), 'alice')).code).toBe(503);
    expect(httpsRequest).toHaveBeenCalledTimes(3);
  });

  it('preserves the session when a response lacks identity information', async () => {
    respond(201);
    expect((await checkKubeconfig(kubeconfig(), 'alice')).code).toBe(503);
  });

  it.each(['ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET', 'ABORT_ERR'])(
    'preserves sessions on %s',
    async (code) => {
      fail(code);
      expect((await checkKubeconfig(kubeconfig(), 'alice')).code).toBe(503);
      expect(httpsRequest).toHaveBeenCalledTimes(1);
    }
  );

  it('expires a stale CA only after the latest user kubeconfig succeeds', async () => {
    fail('UNABLE_TO_VERIFY_LEAF_SIGNATURE');
    respond(200, { status: { kubeConfig: kubeconfig({ token: 'new-token' }, 'bmV3LWNh') } });
    respond(201, identity());
    expect((await checkKubeconfig(kubeconfig(), 'alice')).code).toBe(401);
    expect(httpsRequest.mock.calls[2][1].headers.Authorization).toBe('Bearer new-token');
    expect(httpsRequest.mock.calls[1][1].headers.Authorization).toBe('Bearer admin-token');
    expect(String(httpsRequest.mock.calls[1][0])).toBe(
      'https://apiserver.cluster.local:6443/apis/user.sealos.io/v1/users/alice'
    );
    expect(httpsRequest.mock.calls[2][1].ca).toEqual(Buffer.from('new-ca'));
  });

  it('does not expire a still-valid token after normal refresh and a transient TLS failure', async () => {
    fail('UNABLE_TO_VERIFY_LEAF_SIGNATURE');
    respond(200, { status: { kubeConfig: kubeconfig({ token: 'refreshed-token' }) } });
    respond(201, identity());
    expect((await checkKubeconfig(kubeconfig(), 'alice')).code).toBe(503);
  });

  it('does not expire sessions when the latest kubeconfig also fails TLS', async () => {
    fail('UNABLE_TO_VERIFY_LEAF_SIGNATURE');
    respond(200, { status: { kubeConfig: kubeconfig({ token: 'new-token' }, 'bmV3LWNh') } });
    fail('UNABLE_TO_VERIFY_LEAF_SIGNATURE');
    expect((await checkKubeconfig(kubeconfig(), 'alice')).code).toBe(503);
  });

  it('does not expire a session if the latest config has identical credentials', async () => {
    fail('UNABLE_TO_VERIFY_LEAF_SIGNATURE');
    respond(200, { status: { kubeConfig: kubeconfig() } });
    expect((await checkKubeconfig(kubeconfig(), 'alice')).code).toBe(503);
    expect(httpsRequest).toHaveBeenCalledTimes(2);
  });

  it.each([{ 'token-file': '/server-secret' }, { exec: { command: 'must-never-run' } }])(
    'rejects configs without inline credentials',
    async (user) => {
      expect((await checkKubeconfig(kubeconfig(user), 'alice')).code).toBe(400);
      expect(httpsRequest).not.toHaveBeenCalled();
    }
  );

  it('rejects malformed config without making a request', async () => {
    expect((await checkKubeconfig('invalid: [', 'alice')).code).toBe(400);
    expect(httpsRequest).not.toHaveBeenCalled();
  });

  it('bounds a stalled HTTPS request to five seconds', async () => {
    vi.useFakeTimers();
    vi.spyOn(AbortSignal, 'timeout').mockImplementation((delay) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), delay);
      return controller.signal;
    });
    httpsRequest.mockImplementationOnce((_url, options) => {
      const req = new EventEmitter() as any;
      req.end = () =>
        options.signal.addEventListener('abort', () =>
          req.emit('error', Object.assign(new Error('Aborted'), { code: 'ABORT_ERR' }))
        );
      return req;
    });
    const promise = checkKubeconfig(kubeconfig(), 'alice');
    await vi.advanceTimersByTimeAsync(0);
    expect(httpsRequest).toHaveBeenCalledTimes(1);
    const signal = httpsRequest.mock.calls[0][1].signal;
    await vi.advanceTimersByTimeAsync(4999);
    expect(signal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(signal.aborted).toBe(true);
    expect((await promise).code).toBe(503);
  });

  it('aborts a stalled latest-kubeconfig lookup without expiring the session', async () => {
    vi.useFakeTimers();
    vi.spyOn(AbortSignal, 'timeout').mockImplementation((delay) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), delay);
      return controller.signal;
    });
    fail('UNABLE_TO_VERIFY_LEAF_SIGNATURE');
    const abort = vi.fn();
    httpsRequest.mockImplementationOnce((_url, options) => {
      const req = new EventEmitter() as any;
      req.end = () =>
        options.signal.addEventListener('abort', () => {
          abort();
          req.emit('error', Object.assign(new Error('Aborted'), { code: 'ABORT_ERR' }));
        });
      return req;
    });
    const promise = checkKubeconfig(kubeconfig(), 'alice');
    await vi.advanceTimersByTimeAsync(0);
    expect(httpsRequest).toHaveBeenCalledTimes(2);
    expect(httpsRequest.mock.calls[1][1].method).toBe('GET');
    await vi.advanceTimersByTimeAsync(4999);
    expect(abort).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(abort).toHaveBeenCalledOnce();
    expect((await promise).code).toBe(503);
  });
});
