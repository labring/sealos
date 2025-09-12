import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { authAppToken, verifyJwt } from '@/services/backend/auth';

type SubscriptionInfoResponse = {
  // Add appropriate response type based on your API specification
  [key: string]: any;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return jsonRes(res, { code: 405, message: 'Method not allowed' });
  }

  try {
    // Authentication
    const desktopToken = await authAppToken(req.headers);
    if (!desktopToken) {
      return jsonRes(res, {
        code: 401,
        error: 'Unauthorized'
      });
    }

    const { BILLING_URL, BILLING_SECRET, SEALOS_DOMAIN } = process.env;
    if (!BILLING_SECRET || !BILLING_URL) {
      throw new Error('BILLING_SECRET and BILLING_URL and SEALOS_DOMAIN needs to be configured!');
    }

    const session = await verifyJwt<{
      userId: string;
      userUid: string;
      workspaceId: string;
    }>(desktopToken, BILLING_SECRET).catch(() => null);

    if (!session) {
      return jsonRes(res, {
        code: 401,
        error: 'Unauthorized'
      });
    }

    const response = await fetch(`${BILLING_URL}/account/v1alpha1/workspace-subscription/info`, {
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

    return jsonRes<SubscriptionInfoResponse>(res, {
      data
    });
  } catch (error: any) {
    console.log(error);

    return jsonRes(res, {
      code: 500,
      message: 'Internal server error'
    });
  }
}
