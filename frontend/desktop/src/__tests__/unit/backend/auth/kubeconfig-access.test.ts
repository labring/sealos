import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KubeConfig } from '@kubernetes/client-node';
import {
  getUserKubeconfig,
  getUserKubeconfigNotPatch,
  isAdminKubeconfigUser,
  isKubeconfigAccessDenied,
  KubeconfigAccessDeniedError
} from '@/services/backend/kubernetes/admin';

const client = {
  getClusterCustomObject: vi.fn(),
  getClusterCustomObjectStatus: vi.fn(),
  patchClusterCustomObject: vi.fn(),
  createClusterCustomObject: vi.fn()
};

const setFlag = (value: unknown) =>
  vi.stubGlobal('AppConfig', { desktop: { auth: { adminKubeconfigEnabled: value } } });

describe('kubeconfig access policy', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('AppConfig', undefined);
    vi.spyOn(KubeConfig.prototype, 'loadFromDefault').mockImplementation(() => {});
    vi.spyOn(KubeConfig.prototype, 'makeApiClient').mockReturnValue(client as any);
    client.getClusterCustomObject.mockResolvedValue({
      kind: 'User',
      metadata: { labels: {} },
      status: { kubeConfig: 'test-kubeconfig' }
    });
    client.getClusterCustomObjectStatus.mockResolvedValue({
      status: { kubeConfig: 'test-kubeconfig' }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('identifies only the admin User CR as restricted', () => {
    expect(isAdminKubeconfigUser('admin')).toBe(true);
    expect(isAdminKubeconfigUser('ns-admin')).toBe(false);
    expect(isAdminKubeconfigUser('workspace-user')).toBe(false);
    setFlag(true);
    expect(isAdminKubeconfigUser('admin')).toBe(true);
  });

  it.each([undefined, {}, { desktop: {} }, { desktop: { auth: {} } }])(
    'denies admin before cluster access when config is %j',
    async (config) => {
      vi.stubGlobal('AppConfig', config);
      expect(isKubeconfigAccessDenied('admin')).toBe(true);
      await expect(getUserKubeconfigNotPatch('admin')).rejects.toBeInstanceOf(
        KubeconfigAccessDeniedError
      );
      await expect(getUserKubeconfig('uid', 'admin', 'payg')).rejects.toBeInstanceOf(
        KubeconfigAccessDeniedError
      );
      expect(KubeConfig.prototype.loadFromDefault).not.toHaveBeenCalled();
      expect(KubeConfig.prototype.makeApiClient).not.toHaveBeenCalled();
    }
  );

  it.each([undefined, false, null, 'true', 'false', 1, 0, {}, []])(
    'denies admin for disabled or invalid flag %j',
    async (value) => {
      setFlag(value);
      expect(isKubeconfigAccessDenied('admin')).toBe(true);
      await expect(getUserKubeconfigNotPatch('admin')).rejects.toBeInstanceOf(
        KubeconfigAccessDeniedError
      );
      await expect(getUserKubeconfig('uid', 'admin', 'payg')).rejects.toBeInstanceOf(
        KubeconfigAccessDeniedError
      );
      expect(KubeConfig.prototype.loadFromDefault).not.toHaveBeenCalled();
      expect(client.createClusterCustomObject).not.toHaveBeenCalled();
      expect(client.patchClusterCustomObject).not.toHaveBeenCalled();
    }
  );

  it('reads the existing admin kubeconfig only when explicitly enabled', async () => {
    setFlag(true);
    expect(isKubeconfigAccessDenied('admin')).toBe(false);
    await expect(getUserKubeconfigNotPatch('admin')).resolves.toBe('test-kubeconfig');
    expect(client.getClusterCustomObject).toHaveBeenCalledWith({
      group: 'user.sealos.io',
      version: 'v1',
      plural: 'users',
      name: 'admin'
    });
  });

  it('runs the existing admin initialization flow when enabled', async () => {
    setFlag(true);
    await expect(getUserKubeconfig('uid', 'admin', 'payg')).resolves.toBe('test-kubeconfig');
    expect(client.patchClusterCustomObject).toHaveBeenCalledOnce();
    expect(client.getClusterCustomObjectStatus).toHaveBeenCalledWith({
      group: 'user.sealos.io',
      version: 'v1',
      plural: 'users',
      name: 'admin'
    });
  });

  it('preserves User CR creation through the existing initialization flow', async () => {
    setFlag(true);
    client.getClusterCustomObject.mockRejectedValue({
      body: { kind: 'Status', reason: 'NotFound', code: 404 }
    });
    await expect(getUserKubeconfig('uid', 'admin', 'payg')).resolves.toBe('test-kubeconfig');
    expect(client.createClusterCustomObject).toHaveBeenCalledWith({
      group: 'user.sealos.io',
      version: 'v1',
      plural: 'users',
      body: expect.objectContaining({ metadata: expect.objectContaining({ name: 'admin' }) })
    });
  });

  it.each(['ns-admin', 'workspace-user'])(
    'keeps %s unrestricted with either flag value',
    async (name) => {
      for (const enabled of [false, true]) {
        setFlag(enabled);
        expect(isKubeconfigAccessDenied(name)).toBe(false);
        await expect(getUserKubeconfigNotPatch(name)).resolves.toBe('test-kubeconfig');
        await expect(getUserKubeconfig('uid', name, 'payg')).resolves.toBe('test-kubeconfig');
      }
    }
  );

  it('keeps existing read failure behavior when admin access is enabled', async () => {
    setFlag(true);
    client.getClusterCustomObject.mockRejectedValue(new Error('cluster unavailable'));
    await expect(getUserKubeconfigNotPatch('admin')).resolves.toBeNull();
  });

  it('blocks new requests after the flag is disabled again', async () => {
    setFlag(true);
    await expect(getUserKubeconfigNotPatch('admin')).resolves.toBe('test-kubeconfig');
    setFlag(false);
    await expect(getUserKubeconfigNotPatch('admin')).rejects.toBeInstanceOf(
      KubeconfigAccessDeniedError
    );
    expect(client.getClusterCustomObject).toHaveBeenCalledOnce();
  });
});
