import { verifyAccessToken, generateBillingToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { ToggleAlertsRequest, ToggleAlertsResponse } from '@/types/alert';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Toggles alert notification account enabled status.
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

    const body: ToggleAlertsRequest = req.body;
    const { ids, isEnabled } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return jsonRes(res, {
        code: 400,
        message: 'Missing required field: ids (array)'
      });
    }

    if (typeof isEnabled !== 'boolean') {
      return jsonRes(res, {
        code: 400,
        message: 'Missing required field: isEnabled (boolean)'
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

    const requestBody = {
      ids,
      isEnabled
    };

    const response = await fetch(
      `${billingUrl}/account/v1alpha1/user-alert-notification-account/toggle`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${billingToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Failed to toggle alert notification accounts: ${response.statusText}`
      );
    }

    const result = await response.json();

    jsonRes<ToggleAlertsResponse>(res, {
      data: result.data,
      message: result.message || 'Successfully toggled user alert notification accounts'
    });
  } catch (error) {
    jsonRes(res, {
      code: 500,
      message:
        error instanceof Error ? error.message : 'Failed to toggle alert notification accounts'
    });
  }
}
