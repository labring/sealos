import { checkAndGrantUserRewards } from '@/services/backend/activity/rewards';
import { globalPrisma } from '@/services/backend/db/init';
import { verifyOAuth2AccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

// P1: ordinary web logins and regional JWTs only prove account identity, not that
// official Desktop authorization was completed. The two official public clients are
// allowed explicitly; third parties must never be auto-accepted by name, body, or
// native callback shape.
const DESKTOP_OAUTH_CLIENTS: Readonly<
  Record<
    string,
    {
      grants: readonly string[];
      redirectUri?: string;
    }
  >
> = {
  'af993c98-d19d-4bdc-b338-79b80dc4f8bf': {
    grants: ['urn:ietf:params:oauth:grant-type:device_code']
  },
  'sealox-desktop-bja': {
    grants: ['authorization_code', 'refresh_token'],
    redirectUri: 'http://127.0.0.1/callback'
  }
};

/**
 * Reports a desktop-client login fact (verified via an official OAuth access token):
 * upserts a DesktopLoginRecord (the userUid primary key makes it naturally
 * idempotent — repeat reports only refresh lastSeenAt), then triggers the
 * eligibility check. The login fact is independent of activity availability (the
 * audit fact is always recorded); reward granting has its own internal gate.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return jsonRes(res, { code: 405, message: 'Method not allowed' });
  }
  try {
    const payload = await verifyOAuth2AccessToken(req.headers.authorization);
    const policy =
      payload &&
      typeof payload.client_id === 'string' &&
      Object.prototype.hasOwnProperty.call(DESKTOP_OAUTH_CLIENTS, payload.client_id)
        ? DESKTOP_OAUTH_CLIENTS[payload.client_id]
        : undefined;
    if (!payload || !policy) return jsonRes(res, { code: 401, message: 'invalid Desktop token' });

    // A signed client_id must still keep its official client registration; once the
    // client is deleted or its grants revoked, it can no longer report.
    const client = await globalPrisma.oAuthClient.findUnique({
      where: { clientId: payload.client_id }
    });
    if (
      !client ||
      client.clientType !== 'PUBLIC' ||
      !policy.grants.every((grant) => client.allowedGrantTypes.includes(grant)) ||
      (policy.redirectUri && !client.redirectUris.includes(policy.redirectUri))
    ) {
      return jsonRes(res, { code: 401, message: 'invalid Desktop client' });
    }
    const userUid = payload.sub;
    const clientVersion =
      typeof req.body?.clientVersion === 'string' ? req.body.clientVersion : undefined;
    // The access token carries no grant type: record only the server-verified
    // client and never trust body.authSource.
    const authSource = `oauth2_client:${payload.client_id}`;

    const now = new Date();
    await globalPrisma.desktopLoginRecord.upsert({
      where: { userUid },
      create: { userUid, clientVersion, authSource, firstSeenAt: now, lastSeenAt: now },
      update: { lastSeenAt: now, clientVersion, authSource }
    });

    // Reward failures are only logged and must never affect the login flow
    try {
      await checkAndGrantUserRewards(userUid);
    } catch (error) {
      console.error('reportClientLogin: checkAndGrantUserRewards failed', { userUid, error });
    }

    return jsonRes(res, { code: 200, data: {} });
  } catch (error) {
    console.error('reportClientLogin error:', error);
    return jsonRes(res, { code: 500, message: 'Internal server error' });
  }
}
