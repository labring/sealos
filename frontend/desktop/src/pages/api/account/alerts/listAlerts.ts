import { verifyAccessToken, generateBillingToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { ListAlertsResponse } from '@/types/alert';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Lists all alert notification accounts for the current user.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      return jsonRes(res, { code: 405, message: 'Method not allowed' });
    }

    const session = await verifyAccessToken(req.headers);
    if (!session) {
      return jsonRes(res, {
        code: 401,
        message: 'Unauthorized'
      });
    }

    const billingUrl = global.AppConfig.desktop.auth.billingUrl;
    if (!billingUrl) {
      return jsonRes(res, { code: 500, message: 'Billing service not configured' });
    }

    const billingToken = generateBillingToken({
      userUid: session.userUid,
      userId: session.userId
    });

    const response = await fetch(
      `${billingUrl}/account/v1alpha1/user-alert-notification-account/list`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${billingToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Failed to list alert notification accounts: ${response.statusText}`
      );
    }

    const result = await response.json();

    jsonRes<ListAlertsResponse>(res, {
      data: result.data || [],
      message: result.message || 'Successfully listed user alert notification accounts'
    });
  } catch (error) {
    jsonRes(res, {
      code: 500,
      message: error instanceof Error ? error.message : 'Failed to list alert notification accounts'
    });
  }
}
