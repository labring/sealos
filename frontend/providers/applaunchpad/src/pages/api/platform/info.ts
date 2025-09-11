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

    const billingApiJwtSecret = global.AppConfig.launchpad.components.billing.secret;
    const billingApiRoot = global.AppConfig.launchpad.components.billing.url;
    const regionDomain = global.AppConfig.cloud.domain;

    const session = await verifyJwt<{
      userId: string;
      userUid: string;
      workspaceId: string;
    }>(desktopToken, billingApiJwtSecret).catch(() => null);

    if (!session) {
      return jsonRes(res, {
        code: 401,
        error: 'Unauthorized'
      });
    }

    const response = await fetch(`${billingApiRoot}/account/v1alpha1/workspace-subscription/info`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${desktopToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        workspace: session.workspaceId,
        regionDomain
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
