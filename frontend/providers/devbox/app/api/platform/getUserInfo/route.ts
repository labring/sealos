import type { NextRequest } from 'next/server';

import { jsonRes } from '@/services/backend/response';
import { verifyToken } from '@/services/backend/auth';

type SubscriptionInfoResponse = {
  // Add appropriate response type based on your API specification
  [key: string]: any;
};

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const desktopToken = req.headers.get('X-Desktop-Token');
    if (!desktopToken) {
      return jsonRes({
        code: 401,
        error: 'Unauthorized'
      });
    }

    const { ACCOUNT_URL, SEALOS_DOMAIN, JWT_SECRET } = process.env;
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET needs to be configured!');
    }

    // * Assume we have same JWT secret with DESKTOP TOKEN
    const session = await verifyToken(desktopToken, JWT_SECRET).catch(() => null);
    if (!session) {
      return jsonRes({
        code: 401,
        error: 'Unauthorized'
      });
    }

    const baseUrl = ACCOUNT_URL ? ACCOUNT_URL : `https://account-api.${SEALOS_DOMAIN}`;
    const response = await fetch(baseUrl + '/account/v1alpha1/workspace-subscription/info', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${desktopToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        workspace: session.workspaceId,
        regionDomain: SEALOS_DOMAIN
      })
    });

    const data: SubscriptionInfoResponse = await response.json();

    return jsonRes({
      data
    });
  } catch (error) {
    console.log(error);
    return jsonRes({ code: 500, message: 'get user info error' });
  }
}
