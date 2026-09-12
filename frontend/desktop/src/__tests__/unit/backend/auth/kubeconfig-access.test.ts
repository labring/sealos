import { describe, expect, it } from 'vitest';
import {
  getUserKubeconfig,
  getUserKubeconfigNotPatch,
  isAdminKubeconfigUser,
  KubeconfigAccessDeniedError
} from '@/services/backend/kubernetes/admin';

describe('kubeconfig access policy', () => {
  it('identifies only the admin User CR as restricted', () => {
    expect(isAdminKubeconfigUser('admin')).toBe(true);
    expect(isAdminKubeconfigUser('ns-admin')).toBe(false);
    expect(isAdminKubeconfigUser('workspace-user')).toBe(false);
  });

  it('rejects admin before reading an existing kubeconfig', async () => {
    await expect(getUserKubeconfigNotPatch('admin')).rejects.toBeInstanceOf(
      KubeconfigAccessDeniedError
    );
  });

  it('rejects admin before creating or updating a User CR', async () => {
    await expect(getUserKubeconfig('uid', 'admin', 'payg')).rejects.toBeInstanceOf(
      KubeconfigAccessDeniedError
    );
  });
});
