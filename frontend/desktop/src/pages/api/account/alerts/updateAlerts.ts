import { verifyAccessToken, generateBillingToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { ToggleAlertsRequest, ToggleAlertsResponse } from '@/types/alert';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Toggles alert notification account enabled status.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('[updateAlerts] Request received:', {
      method: req.method,
      body: req.body,
      headers: { authorization: req.headers.authorization ? 'present' : 'missing' }
    });

    if (req.method !== 'POST') {
      return jsonRes(res, { code: 405, message: 'Method not allowed' });
    }

    const session = await verifyAccessToken(req.headers);
    if (!session) {
      console.log('[updateAlerts] Unauthorized: session verification failed');
      return jsonRes(res, {
        code: 401,
        message: 'Unauthorized'
      });
    }

    console.log('[updateAlerts] Session verified:', {
      userUid: session.userUid,
      userId: session.userId
    });

    const body: ToggleAlertsRequest = req.body;
    const { ids, isEnabled } = body;

    console.log('[updateAlerts] Request body:', { ids, isEnabled });

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      console.log('[updateAlerts] Validation failed: missing or empty ids array');
      return jsonRes(res, {
        code: 400,
        message: 'Missing required field: ids (array)'
      });
    }

    if (typeof isEnabled !== 'boolean') {
      console.log('[updateAlerts] Validation failed: isEnabled is not boolean');
      return jsonRes(res, {
        code: 400,
        message: 'Missing required field: isEnabled (boolean)'
      });
    }

    const billingUrl = global.AppConfig.desktop.auth.billingUrl;
    if (!billingUrl) {
      console.log('[updateAlerts] Error: Billing service not configured');
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

    console.log('[updateAlerts] Calling billing service:', {
      url: `${billingUrl}/account/v1alpha1/user-alert-notification-account/toggle`,
      body: requestBody,
      hasToken: !!billingToken
    });

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

    console.log('[updateAlerts] Billing service response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log('[updateAlerts] Billing service error:', errorData);
      throw new Error(
        errorData.error || `Failed to toggle alert notification accounts: ${response.statusText}`
      );
    }

    const result = await response.json();
    console.log('[updateAlerts] Billing service success:', result);

    jsonRes<ToggleAlertsResponse>(res, {
      data: result.data,
      message: result.message || 'Successfully toggled user alert notification accounts'
    });
  } catch (error) {
    console.error('[updateAlerts] Error:', error);
    jsonRes(res, {
      code: 500,
      message:
        error instanceof Error ? error.message : 'Failed to toggle alert notification accounts'
    });
  }
}
