import { CustomObjectsApi } from '@kubernetes/client-node';
import axios from 'axios';
import { generateAppToken } from '@/services/backend/auth';
import { K8sApiDefault } from '@/services/backend/kubernetes/admin';
import type { AccessTokenPayload } from '@/types/token';

// Keep credential generation, ownership checks and concurrent creation in Registry.
// A Registry outage must not prevent users from signing in to Desktop.
export async function ensureWorkspaceRegistrySecret(payload: AccessTokenPayload): Promise<void> {
  try {
    const client = K8sApiDefault().makeApiClient(CustomObjectsApi);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        client.getNamespacedCustomObject(
          'app.sealos.io',
          'v1',
          'app-system',
          'apps',
          'sealos-registry'
        ),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error('Registry discovery timed out')), 5000);
        })
      ]);
    } catch (error) {
      if ((error as { statusCode?: number }).statusCode === 404) return;
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    // Use the management Service: private installations may have self-signed ingress certificates.
    const origin =
      process.env.SEALOS_REGISTRY_INTERNAL_URL ||
      'http://sealos-registry.registry-system.svc.cluster.local';
    const url = new URL('/api/runtime/registry-secret', origin);
    // Verified access tokens also carry exp/iat; do not copy them into a newly signed token.
    const { userUid, userId, regionUid, userCrUid, userCrName, workspaceUid, workspaceId } =
      payload;
    const appToken = generateAppToken({
      userUid,
      userId,
      regionUid,
      userCrUid,
      userCrName,
      workspaceUid,
      workspaceId
    });
    const { data } = await axios.post(url.toString(), undefined, {
      headers: { 'Authorization-Bearer': appToken },
      timeout: 5000,
      // Never forward the desktop token to a redirect target.
      maxRedirects: 0
    });
    if (data.namespace !== payload.workspaceId || data.secretName !== 'sealos-registry-secret') {
      throw new Error('Unexpected registry initialization response');
    }
  } catch (error) {
    // Axios errors can contain the bearer token; log safe metadata only.
    console.error('Failed to initialize workspace registry secret', {
      workspaceId: payload.workspaceId,
      status: axios.isAxiosError(error)
        ? error.response?.status
        : (error as { statusCode?: number }).statusCode
    });
  }
}
